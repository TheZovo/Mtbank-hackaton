from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.base import utcnow
from db.models import PaymentRequest, User
from modules.payment_requests.schemas import (
    PaymentRequestCreateResponse,
    PaymentRequestOut,
    PaymentRequestPayResponse,
)


async def create_payment_request(
    session: AsyncSession,
    *,
    amount: float,
    description: str,
    user_id: str,
) -> PaymentRequestCreateResponse:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    payment_request = PaymentRequest(
        amount=amount,
        description=description.strip(),
        user_id=user_id,
    )
    session.add(payment_request)
    await session.commit()
    return PaymentRequestCreateResponse(id=payment_request.payment_request_id)


async def get_payment_request(session: AsyncSession, request_id: str) -> PaymentRequestOut:
    payment_request = await session.get(PaymentRequest, request_id)
    if payment_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return PaymentRequestOut(
        id=payment_request.payment_request_id,
        amount=payment_request.amount,
        description=payment_request.description,
        status=payment_request.status,
    )


async def pay_payment_request(session: AsyncSession, request_id: str) -> PaymentRequestPayResponse:
    payment_request = await session.get(PaymentRequest, request_id)
    if payment_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    payment_request.status = "paid"
    payment_request.paid_at = utcnow()
    await session.commit()
    return PaymentRequestPayResponse(success=True)
