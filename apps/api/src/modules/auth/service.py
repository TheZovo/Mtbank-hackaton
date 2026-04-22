from __future__ import annotations

from datetime import timedelta

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.enums import SegmentKey
from core.security import (
    create_access_token,
    decode_access_token,
    ensure_utc,
    generate_otp_code,
    generate_refresh_token,
    hash_secret,
    normalize_phone,
    utcnow,
    verify_secret,
)
from db.models import AuthSession, OtpChallenge, User, UserProfile
from db.session import get_db_session, get_job_dispatcher, get_otp_store, get_settings_from_request
from infrastructure.cache.otp_store import OtpStoreRecord
from modules.auth.schemas import AuthLoginResponse, AuthTokensResponse, RequestOtpResponse, VerifyOtpRequest
from modules.profile.schemas import MeResponse, UserSummaryOut
from modules.progression.service import provision_user

bearer_scheme = HTTPBearer(auto_error=False)


async def request_otp_code(
    *,
    phone: str,
    session: AsyncSession,
    settings,
    otp_store,
    job_dispatcher,
) -> RequestOtpResponse:
    normalized_phone = normalize_phone(phone)
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
    return RequestOtpResponse(
        challenge_id=challenge.challenge_id,
        expires_in_seconds=settings.otp_ttl_seconds,
        dev_code=otp_code if settings.otp_dev_bypass else None,
    )


async def verify_otp_code(
    *,
    payload: VerifyOtpRequest,
    request: Request,
    session: AsyncSession,
    settings,
    otp_store,
) -> AuthLoginResponse:
    normalized_phone = normalize_phone(payload.phone)
    challenge = await session.get(OtpChallenge, payload.challenge_id)
    if challenge is None or challenge.phone != normalized_phone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OTP challenge не найден")
    if challenge.consumed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP challenge уже использован")
    if ensure_utc(challenge.expires_at) <= utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Срок действия OTP истек")

    record = await otp_store.get(challenge.challenge_id)
    attempts = record.attempts if record is not None else challenge.attempt_count
    if attempts >= settings.otp_max_attempts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Превышено число попыток OTP")
    if not verify_secret(payload.otp_code, (record.code_hash if record is not None else challenge.code_hash)):
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
            max(int((challenge.expires_at - utcnow()).total_seconds()), 1),
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный OTP код")

    user = await provision_user(
        session,
        phone=normalized_phone,
        display_name=payload.display_name,
        segment=payload.segment or SegmentKey.STUDENT,
    )
    refresh_token = generate_refresh_token()
    auth_session = AuthSession(
        user_id=user.user_id,
        refresh_token_hash=hash_secret(refresh_token),
        user_agent=request.headers.get("user-agent"),
        device_name=request.headers.get("x-device-name"),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_ttl_days),
    )
    challenge.consumed_at = utcnow()
    session.add(auth_session)
    await session.commit()
    await session.refresh(auth_session)
    await otp_store.delete(challenge.challenge_id)

    access_token, expires_in_seconds = create_access_token(
        settings=settings,
        user_id=user.user_id,
        session_id=auth_session.session_id,
    )
    me = MeResponse(
        user=UserSummaryOut.model_validate(user, from_attributes=True),
        selected_planet=(await session.get(UserProfile, user.user_id)).selected_planet,
    )
    return AuthLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in_seconds=expires_in_seconds,
        user=me.user,
        me=me,
    )


async def refresh_auth_tokens(*, refresh_token: str, session: AsyncSession, settings) -> AuthTokensResponse:
    auth_session = await session.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == hash_secret(refresh_token))
    )
    if auth_session is None or auth_session.revoked_at is not None or ensure_utc(auth_session.expires_at) <= utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token недействителен")

    new_refresh_token = generate_refresh_token()
    auth_session.refresh_token_hash = hash_secret(new_refresh_token)
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


async def revoke_refresh_session(*, refresh_token: str, session: AsyncSession) -> None:
    auth_session = await session.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == hash_secret(refresh_token))
    )
    if auth_session is not None and auth_session.revoked_at is None:
        auth_session.revoked_at = utcnow()
        await session.commit()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация")
    settings = get_settings_from_request(request)
    try:
        payload = decode_access_token(credentials.credentials, settings)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный access token") from exc
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный тип токена")
    auth_session = await session.get(AuthSession, payload["sid"])
    if auth_session is None or auth_session.revoked_at is not None or ensure_utc(auth_session.expires_at) <= utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Сессия истекла")
    user = await session.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    return user
