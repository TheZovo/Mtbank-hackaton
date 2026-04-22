from __future__ import annotations

from pydantic import BaseModel


class TransactionWebhookRequest(BaseModel):
    user_id: str
    amount_rub: float
    mcc_code: str


class TransactionWebhookResponse(BaseModel):
    status: str
    small_stars_awarded: int
    planet_id: str | None
