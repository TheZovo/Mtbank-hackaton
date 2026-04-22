from __future__ import annotations

import secrets
import string

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import PromoCode, User
from modules.promocodes.schemas import PromoCodeOut

PROMO_ALPHABET = string.ascii_uppercase + string.digits


def generate_promocode_value(planet_id: str) -> str:
    suffix = "".join(secrets.choice(PROMO_ALPHABET) for _ in range(4))
    return f"MTB_{planet_id.upper()}_{suffix}"


async def list_promocodes(session: AsyncSession, user: User) -> list[PromoCodeOut]:
    rows = (
        await session.scalars(
            select(PromoCode).where(PromoCode.user_id == user.user_id).order_by(desc(PromoCode.issued_at))
        )
    ).all()
    return [PromoCodeOut.model_validate(item, from_attributes=True) for item in rows]


async def issue_promocode(session: AsyncSession, *, user_id: str, planet_id: str, code: str | None = None) -> PromoCode:
    promocode = PromoCode(
        user_id=user_id,
        planet_id=planet_id,
        code=code or generate_promocode_value(planet_id),
    )
    session.add(promocode)
    await session.flush()
    return promocode
