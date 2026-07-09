from __future__ import annotations

from pydantic import BaseModel, model_validator


class ReferralCreateRequest(BaseModel):
    phone: str | None = None
    invitee_phone: str | None = None

    @model_validator(mode="after")
    def normalize_phone(self) -> "ReferralCreateRequest":
        if self.phone is None and self.invitee_phone is not None:
            self.phone = self.invitee_phone
        if not self.phone:
            raise ValueError("phone is required")
        return self


class ReferralInviteOut(BaseModel):
    phone: str
    status: str
    stars_earned: int


class ReferralListResponse(BaseModel):
    invite_code: str
    referrals: list[ReferralInviteOut]


class ReferralCreateResponse(BaseModel):
    status: str
    invite_code: str
