from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

from common.enums import SegmentKey
from modules.profile.schemas import MeResponse, UserSummaryOut


class RequestOtpRequest(BaseModel):
    phone: str


class RequestOtpResponse(BaseModel):
    message: str = "OTP sent"
    challenge_id: str
    expires_in_seconds: int
    dev_code: str | None = None
    dev_otp: str | None = None


class VerifyOtpRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    challenge_id: str | None = None
    phone: str
    otp_code: str | None = None
    code: str | None = None
    display_name: str | None = None
    name: str | None = None
    segment: SegmentKey | None = None

    @model_validator(mode="after")
    def normalize_fields(self) -> "VerifyOtpRequest":
        if self.otp_code is None and self.code is not None:
            self.otp_code = self.code
        if self.display_name is None and self.name is not None:
            self.display_name = self.name
        if not self.otp_code:
            raise ValueError("otp_code is required")
        return self


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class AuthTokensResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int


class AuthLoginResponse(AuthTokensResponse):
    user: UserSummaryOut
    me: MeResponse
