from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from modules.progression.service import seed_quest_catalog


async def seed_defaults(session: AsyncSession) -> None:
    await seed_quest_catalog(session)
    await session.commit()
