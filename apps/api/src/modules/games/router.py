from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from common.enums import GameCode
from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.games.schemas import GameRunOut, GameRunSubmitRequest, GameSummaryOut
from modules.games.service import get_game_summary, submit_game_run

router = APIRouter(prefix="/games", tags=["games"])


@router.post("/{game_code}/runs", response_model=GameRunOut)
async def create_game_run(
    game_code: GameCode,
    payload: GameRunSubmitRequest,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> GameRunOut:
    return await submit_game_run(session, current_user, game_code.value, payload.score, payload.planet_id)


@router.get("/summary", response_model=GameSummaryOut)
async def game_summary(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> GameSummaryOut:
    return await get_game_summary(session, current_user)
