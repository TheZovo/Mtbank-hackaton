from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.profile.schemas import MeResponse
from modules.profile.service import build_me_response
from modules.users.schemas import UserByNicknameRequest, UserByNicknameResponse
from modules.users.service import create_or_update_user_by_nickname, find_user_by_nickname

router = APIRouter(tags=["users"])


@router.post("/users", response_model=UserByNicknameResponse)
async def create_user(
    payload: UserByNicknameRequest,
    session: AsyncSession = Depends(get_db_session),
) -> UserByNicknameResponse:
    return await create_or_update_user_by_nickname(session, payload)


@router.get("/users", response_model=UserByNicknameResponse)
async def get_user_by_nickname(
    nickname: str = Query(...),
    session: AsyncSession = Depends(get_db_session),
) -> UserByNicknameResponse:
    return await find_user_by_nickname(session, nickname)


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeResponse:
    return await build_me_response(session, current_user)
