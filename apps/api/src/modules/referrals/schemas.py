from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReferralCreateRequest(BaseModel):
    invitee_phone: str


class ReferralOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    referral_id: str
    inviter_user_id: str
    invitee_phone: str
    state: str
    invite_code: str
    created_at: datetime
