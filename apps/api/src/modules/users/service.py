from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from common.enums import SegmentKey
from core.security import generate_id
from db.models import User, UserProfile
from modules.users.schemas import UserByNicknameRequest, UserByNicknameResponse


async def _find_user_by_nickname(session: AsyncSession, nickname: str) -> User | None:
    return await session.scalar(select(User).where(func.lower(User.nickname) == nickname.lower()))


async def create_or_update_user_by_nickname(
    session: AsyncSession,
    payload: UserByNicknameRequest,
) -> UserByNicknameResponse:
    existing = await _find_user_by_nickname(session, payload.nickname)

    if payload.user_id:
        user = await session.get(User, payload.user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if existing is not None and existing.user_id != user.user_id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nickname already taken")
        user.nickname = payload.nickname
        await session.commit()
        return UserByNicknameResponse(id=user.user_id, nickname=payload.nickname)

    if existing is not None:
        return UserByNicknameResponse(id=existing.user_id, nickname=existing.nickname or payload.nickname)

    user = User(
        phone=f"nickname:{generate_id('nck')}",
        display_name=payload.nickname,
        nickname=payload.nickname,
        segment=SegmentKey.STUDENT.value,
    )
    session.add(user)
    await session.flush()
    session.add(UserProfile(user_id=user.user_id))
    await session.commit()
    return UserByNicknameResponse(id=user.user_id, nickname=payload.nickname)


async def find_user_by_nickname(session: AsyncSession, nickname: str) -> UserByNicknameResponse:
    user = await _find_user_by_nickname(session, nickname.strip())
    if user is None or user.nickname is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserByNicknameResponse(id=user.user_id, nickname=user.nickname)
