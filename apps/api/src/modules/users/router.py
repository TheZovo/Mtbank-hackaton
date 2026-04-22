from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.profile.schemas import MeResponse
from modules.profile.service import build_me_response

router = APIRouter(tags=["users"])


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeResponse:
    return await build_me_response(session, current_user)
