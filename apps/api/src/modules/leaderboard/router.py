from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.profile.schemas import LeaderboardEntryOut
from modules.leaderboard.service import get_leaderboard

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntryOut])
async def leaderboard(
    _: object = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    return await get_leaderboard(session)
