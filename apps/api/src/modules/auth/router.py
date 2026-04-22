from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session, get_job_dispatcher, get_otp_store, get_settings_from_request
from modules.auth.schemas import (
    AuthLoginResponse,
    AuthTokensResponse,
    LogoutRequest,
    RefreshRequest,
    RequestOtpRequest,
    RequestOtpResponse,
    VerifyOtpRequest,
)
from modules.auth.service import refresh_auth_tokens, request_otp_code, revoke_refresh_session, verify_otp_code

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp", response_model=RequestOtpResponse)
async def request_otp(
    payload: RequestOtpRequest,
    session: AsyncSession = Depends(get_db_session),
    settings=Depends(get_settings_from_request),
    otp_store=Depends(get_otp_store),
    job_dispatcher=Depends(get_job_dispatcher),
) -> RequestOtpResponse:
    return await request_otp_code(
        phone=payload.phone,
        session=session,
        settings=settings,
        otp_store=otp_store,
        job_dispatcher=job_dispatcher,
    )


@router.post("/verify-otp", response_model=AuthLoginResponse)
async def verify_otp(
    payload: VerifyOtpRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    settings=Depends(get_settings_from_request),
    otp_store=Depends(get_otp_store),
) -> AuthLoginResponse:
    return await verify_otp_code(
        payload=payload,
        request=request,
        session=session,
        settings=settings,
        otp_store=otp_store,
    )


@router.post("/refresh", response_model=AuthTokensResponse)
async def refresh_tokens(
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_db_session),
    settings=Depends(get_settings_from_request),
) -> AuthTokensResponse:
    return await refresh_auth_tokens(refresh_token=payload.refresh_token, session=session, settings=settings)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    await revoke_refresh_session(refresh_token=payload.refresh_token, session=session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
