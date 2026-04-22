from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.profile.schemas import RewardOut
from modules.rewards.service import list_reward_ledger

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/ledger", response_model=list[RewardOut])
async def get_reward_ledger(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[RewardOut]:
    return await list_reward_ledger(session, current_user)
