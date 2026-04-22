from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import MccToPlanet, User
from modules.progression.service import add_small_star
from modules.transactions.schemas import TransactionWebhookResponse


async def handle_transaction_webhook(
    session: AsyncSession,
    *,
    user_id: str,
    amount_rub: float,
    mcc_code: str,
) -> TransactionWebhookResponse:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    if amount_rub < 20:
        return TransactionWebhookResponse(status="ok", small_stars_awarded=0, planet_id=None)

    mapping = await session.get(MccToPlanet, mcc_code)
    if mapping is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MCC не привязан к планете")

    await add_small_star(session, user_id=user_id, planet_id=mapping.planet_id, source="transaction")
    await session.commit()
    return TransactionWebhookResponse(status="ok", small_stars_awarded=1, planet_id=mapping.planet_id)
