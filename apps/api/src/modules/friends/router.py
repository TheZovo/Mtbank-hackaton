from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.friends.schemas import FriendAddRequest, FriendEntryOut, PlayTogetherRequest, PlayTogetherResponse, SimpleSuccessResponse
from modules.friends.service import add_friend, list_friends, play_together

router = APIRouter(tags=["friends"])


@router.post("/friends", response_model=SimpleSuccessResponse)
async def create_friendship(
    payload: FriendAddRequest,
    session: AsyncSession = Depends(get_db_session),
) -> SimpleSuccessResponse:
    return await add_friend(session, payload.user_id, payload.friend_id)


@router.get("/friends/{user_id}", response_model=list[FriendEntryOut])
async def get_friends(
    user_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> list[FriendEntryOut]:
    return await list_friends(session, user_id)


@router.post("/play-together", response_model=PlayTogetherResponse, response_model_exclude_none=True)
async def create_play_together(
    payload: PlayTogetherRequest,
    session: AsyncSession = Depends(get_db_session),
) -> PlayTogetherResponse:
    return await play_together(session, payload.user_id, payload.friend_id)
