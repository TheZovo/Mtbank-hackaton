from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session, get_leaderboard_cache
from modules.admin.schemas import EndPeriodResponse
from modules.admin.service import end_period
from modules.internal import require_internal_token

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/end_period", response_model=EndPeriodResponse, dependencies=[Depends(require_internal_token)])
async def end_period_endpoint(
    session: AsyncSession = Depends(get_db_session),
    cache=Depends(get_leaderboard_cache),
) -> EndPeriodResponse:
    return await end_period(session, cache=cache)
