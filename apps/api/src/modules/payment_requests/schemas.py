from __future__ import annotations

from pydantic import BaseModel


class PaymentRequestCreateRequest(BaseModel):
    amount: float
    description: str
    user_id: str


class PaymentRequestCreateResponse(BaseModel):
    id: str


class PaymentRequestOut(BaseModel):
    id: str
    amount: float
    description: str
    status: str


class PaymentRequestPayResponse(BaseModel):
    success: bool
