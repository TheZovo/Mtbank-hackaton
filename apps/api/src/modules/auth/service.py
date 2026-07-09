from __future__ import annotations

from datetime import timedelta

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from common.enums import SegmentKey
from core.security import (
    build_refresh_token,
    create_access_token,
    decode_access_token,
    ensure_utc,
    extract_refresh_session_id,
    generate_id,
    generate_otp_code,
    hash_refresh_token,
    hash_secret,
    normalize_phone,
    utcnow,
    verify_refresh_token,
    verify_secret,
)
from db.models import AuthSession, OtpChallenge, User
from db.session import get_db_session, get_settings_from_request
from infrastructure.cache.otp_store import OtpStoreRecord
from modules.auth.schemas import AuthLoginResponse, AuthTokensResponse, RequestOtpResponse, VerifyOtpRequest
from modules.profile.service import build_me_response
from modules.progression.service import provision_user, record_login_progress

bearer_scheme = HTTPBearer(auto_error=False)


async def _resolve_otp_challenge(
    session: AsyncSession,
    *,
    challenge_id: str | None,
    phone: str,
) -> OtpChallenge | None:
    if challenge_id:
        challenge = await session.get(OtpChallenge, challenge_id)
        if challenge is not None and challenge.phone == phone:
            return challenge

    return await session.scalar(
        select(OtpChallenge)
        .where(OtpChallenge.phone == phone, OtpChallenge.consumed_at.is_(None))
        .order_by(desc(OtpChallenge.created_at))
        .limit(1)
    )


async def request_otp_code(
    *,
    phone: str,
    session: AsyncSession,
    settings,
    otp_store,
    job_dispatcher,
) -> RequestOtpResponse:
    try:
        normalized_phone = normalize_phone(phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    window_start = utcnow() - timedelta(hours=1)
    sent_last_hour = int(
        (
            await session.scalar(
                select(func.count(OtpChallenge.challenge_id)).where(
                    OtpChallenge.phone == normalized_phone,
                    OtpChallenge.created_at >= window_start,
                )
            )
        )
        or 0
    )
    if sent_last_hour >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="OTP request limit exceeded. Try again later.",
        )

    otp_code = generate_otp_code()
    challenge = OtpChallenge(
        phone=normalized_phone,
        code_hash=hash_secret(otp_code),
        expires_at=utcnow() + timedelta(seconds=settings.otp_ttl_seconds),
    )
    session.add(challenge)
    await session.commit()
    await session.refresh(challenge)
    await otp_store.set(
        OtpStoreRecord(
            challenge_id=challenge.challenge_id,
            phone=normalized_phone,
            code_hash=challenge.code_hash,
            expires_at=challenge.expires_at.isoformat(),
            attempts=0,
        ),
        settings.otp_ttl_seconds,
    )
    await job_dispatcher.send_otp(phone=normalized_phone, code=otp_code)
    dev_code = otp_code if settings.otp_dev_bypass else None
    return RequestOtpResponse(
        message="OTP sent",
        challenge_id=challenge.challenge_id,
        expires_in_seconds=settings.otp_ttl_seconds,
        dev_code=dev_code,
        dev_otp=dev_code,
    )


async def verify_otp_code(
    *,
    payload: VerifyOtpRequest,
    request: Request,
    session: AsyncSession,
    settings,
    otp_store,
) -> AuthLoginResponse:
    try:
        normalized_phone = normalize_phone(payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    challenge = await _resolve_otp_challenge(
        session,
        challenge_id=payload.challenge_id,
        phone=normalized_phone,
    )
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OTP challenge not found")
    if challenge.consumed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP challenge already used")
    if ensure_utc(challenge.expires_at) <= utcnow():
        await otp_store.delete(challenge.challenge_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP challenge expired")

    record = await otp_store.get(challenge.challenge_id)
    attempts = record.attempts if record is not None else challenge.attempt_count
    if attempts >= settings.otp_max_attempts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP attempts exceeded")

    expected_hash = record.code_hash if record is not None else challenge.code_hash
    if not verify_secret(payload.otp_code or "", expected_hash):
        challenge.attempt_count = attempts + 1
        await session.commit()
        await otp_store.set(
            OtpStoreRecord(
                challenge_id=challenge.challenge_id,
                phone=challenge.phone,
                code_hash=challenge.code_hash,
                expires_at=challenge.expires_at.isoformat(),
                attempts=challenge.attempt_count,
            ),
            max(int((ensure_utc(challenge.expires_at) - utcnow()).total_seconds()), 1),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    user = await provision_user(
        session,
        phone=normalized_phone,
        display_name=payload.display_name,
        segment=payload.segment or SegmentKey.STUDENT,
    )
    session_id = generate_id("ses")
    refresh_token = build_refresh_token(session_id)
    auth_session = AuthSession(
        session_id=session_id,
        user_id=user.user_id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        user_agent=request.headers.get("user-agent"),
        device_name=request.headers.get("x-device-name"),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_ttl_days),
    )
    challenge.consumed_at = utcnow()
    session.add(auth_session)
    await record_login_progress(session, user)
    await session.commit()
    await otp_store.delete(challenge.challenge_id)

    access_token, expires_in_seconds = create_access_token(
        settings=settings,
        user_id=user.user_id,
        session_id=auth_session.session_id,
    )
    me = await build_me_response(session, user)
    return AuthLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in_seconds=expires_in_seconds,
        user=me.user,
        me=me,
    )


async def refresh_auth_tokens(*, refresh_token: str, session: AsyncSession, settings) -> AuthTokensResponse:
    session_id = extract_refresh_session_id(refresh_token)
    if session_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid")

    auth_session = await session.get(AuthSession, session_id)
    if auth_session is None or auth_session.revoked_at is not None or ensure_utc(auth_session.expires_at) <= utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid")
    if not verify_refresh_token(refresh_token, auth_session.refresh_token_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid")

    new_refresh_token = build_refresh_token(auth_session.session_id)
    auth_session.refresh_token_hash = hash_refresh_token(new_refresh_token)
    auth_session.expires_at = utcnow() + timedelta(days=settings.refresh_token_ttl_days)
    await session.commit()

    access_token, expires_in_seconds = create_access_token(
        settings=settings,
        user_id=auth_session.user_id,
        session_id=auth_session.session_id,
    )
    return AuthTokensResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in_seconds=expires_in_seconds,
    )


async def revoke_refresh_session(
    *,
    session: AsyncSession,
    auth_session_id: str | None = None,
    refresh_token: str | None = None,
) -> None:
    session_id = auth_session_id or (extract_refresh_session_id(refresh_token) if refresh_token else None)
    if session_id is None:
        return

    auth_session = await session.get(AuthSession, session_id)
    if auth_session is None:
        return
    await session.delete(auth_session)
    await session.commit()


async def get_current_auth_session(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> AuthSession:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    settings = get_settings_from_request(request)
    try:
        payload = decode_access_token(credentials.credentials, settings)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    auth_session = await session.get(AuthSession, payload["sid"])
    if auth_session is None or auth_session.revoked_at is not None or ensure_utc(auth_session.expires_at) <= utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    return auth_session


async def get_current_user(
    session: AsyncSession = Depends(get_db_session),
    auth_session: AuthSession = Depends(get_current_auth_session),
) -> User:
    user = await session.get(User, auth_session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
