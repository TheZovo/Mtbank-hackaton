from __future__ import annotations

from pydantic import BaseModel

from common.enums import SegmentKey
from modules.profile.schemas import MeResponse, UserSummaryOut


class RequestOtpRequest(BaseModel):
    phone: str


class RequestOtpResponse(BaseModel):
    challenge_id: str
    expires_in_seconds: int
    dev_code: str | None = None


class VerifyOtpRequest(BaseModel):
    challenge_id: str
    phone: str
    otp_code: str
    display_name: str | None = None
    segment: SegmentKey | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class AuthTokensResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int


class AuthLoginResponse(AuthTokensResponse):
    user: UserSummaryOut
    me: MeResponse
