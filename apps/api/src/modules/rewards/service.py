from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import RewardLedger, User
from modules.profile.schemas import RewardOut
from modules.profile.service import map_reward_entry


async def list_reward_ledger(session: AsyncSession, user: User) -> list[RewardOut]:
    rows = (
        await session.scalars(
            select(RewardLedger).where(RewardLedger.user_id == user.user_id).order_by(desc(RewardLedger.created_at))
        )
    ).all()
    return [map_reward_entry(item) for item in rows]
