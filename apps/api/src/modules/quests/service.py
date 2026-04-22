from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Quest, QuestProgress, User
from modules.profile.schemas import QuestOut, RewardOut
from modules.profile.service import map_quest_entry, map_reward_entry
from modules.progression.service import claim_quest_reward


async def list_user_quests(session: AsyncSession, user: User) -> list[QuestOut]:
    rows = (
        await session.execute(
            select(Quest, QuestProgress)
            .join(QuestProgress, Quest.quest_id == QuestProgress.quest_id)
            .where(QuestProgress.user_id == user.user_id, Quest.active.is_(True))
            .order_by(Quest.display_order, Quest.quest_id)
        )
    ).all()
    return [map_quest_entry(quest, progress) for quest, progress in rows]


async def claim_user_quest(session: AsyncSession, user: User, quest_id: str) -> RewardOut:
    reward = await claim_quest_reward(session, user=user, quest_id=quest_id)
    await session.commit()
    await session.refresh(reward)
    return map_reward_entry(reward)
