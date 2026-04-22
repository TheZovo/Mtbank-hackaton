from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session, get_leaderboard_cache
from modules.auth.service import get_current_user
from modules.leaderboard.schemas import PlanetLeaderboardOut
from modules.leaderboard.service import get_leaderboard, get_planet_leaderboard

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
async def leaderboard(
    _: object = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    return await get_leaderboard(session)


@router.get("/planet/{planet_id}", response_model=PlanetLeaderboardOut)
async def planet_leaderboard(
    planet_id: str,
    period: str = "week",
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    cache=Depends(get_leaderboard_cache),
) -> PlanetLeaderboardOut:
    return await get_planet_leaderboard(
        session,
        user=current_user,
        planet_id=planet_id,
        period=period,
        cache=cache,
    )
