from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.profile.schemas import QuestOut, RewardOut
from modules.quests.service import claim_user_quest, list_user_quests

router = APIRouter(prefix="/quests", tags=["quests"])


@router.get("", response_model=list[QuestOut])
async def get_quests(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[QuestOut]:
    return await list_user_quests(session, current_user)


@router.post("/{quest_id}/claim", response_model=RewardOut)
async def claim_quest(
    quest_id: str,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> RewardOut:
    return await claim_user_quest(session, current_user, quest_id)
