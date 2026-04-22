from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.internal import require_internal_token
from modules.transactions.schemas import TransactionWebhookRequest, TransactionWebhookResponse
from modules.transactions.service import handle_transaction_webhook

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/webhook", response_model=TransactionWebhookResponse, dependencies=[Depends(require_internal_token)])
async def transaction_webhook(
    payload: TransactionWebhookRequest,
    session: AsyncSession = Depends(get_db_session),
) -> TransactionWebhookResponse:
    return await handle_transaction_webhook(
        session,
        user_id=payload.user_id,
        amount_rub=payload.amount_rub,
        mcc_code=payload.mcc_code,
    )
