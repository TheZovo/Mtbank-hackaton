from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.payment_requests.schemas import (
    PaymentRequestCreateRequest,
    PaymentRequestCreateResponse,
    PaymentRequestOut,
    PaymentRequestPayResponse,
)
from modules.payment_requests.service import create_payment_request, get_payment_request, pay_payment_request

router = APIRouter(prefix="/payment-requests", tags=["payment-requests"])


@router.post("", response_model=PaymentRequestCreateResponse)
async def create_payment_request_endpoint(
    payload: PaymentRequestCreateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> PaymentRequestCreateResponse:
    return await create_payment_request(
        session,
        amount=payload.amount,
        description=payload.description,
        user_id=payload.user_id,
    )


@router.get("/{request_id}", response_model=PaymentRequestOut)
async def get_payment_request_endpoint(
    request_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> PaymentRequestOut:
    return await get_payment_request(session, request_id)


@router.post("/{request_id}/pay", response_model=PaymentRequestPayResponse)
async def pay_payment_request_endpoint(
    request_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> PaymentRequestPayResponse:
    return await pay_payment_request(session, request_id)
