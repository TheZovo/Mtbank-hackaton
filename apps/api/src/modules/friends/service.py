from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.enums import PlanetCode
from db.models import Friend, Gift, User
from modules.friends.schemas import FriendEntryOut, PlayTogetherResponse, SimpleSuccessResponse
from modules.promocodes.service import issue_promocode


async def _get_user(session: AsyncSession, user_id: str) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def _get_friendship(session: AsyncSession, user_id: str, friend_id: str) -> Friend | None:
    return await session.scalar(
        select(Friend).where(
            Friend.user_id == user_id,
            Friend.friend_id == friend_id,
        )
    )


async def add_friend(session: AsyncSession, user_id: str, friend_id: str) -> SimpleSuccessResponse:
    if user_id == friend_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add yourself as a friend")

    await _get_user(session, user_id)
    await _get_user(session, friend_id)

    direct = await _get_friendship(session, user_id, friend_id)
    reverse = await _get_friendship(session, friend_id, user_id)

    if direct is None:
        session.add(Friend(user_id=user_id, friend_id=friend_id))
    if reverse is None:
        session.add(Friend(user_id=friend_id, friend_id=user_id))

    await session.commit()
    return SimpleSuccessResponse(success=True)


async def list_friends(session: AsyncSession, user_id: str) -> list[FriendEntryOut]:
    rows = (
        await session.execute(
            select(Friend, User)
            .join(User, User.user_id == Friend.friend_id)
            .where(Friend.user_id == user_id)
            .order_by(User.nickname.asc(), User.display_name.asc())
        )
    ).all()
    return [
        FriendEntryOut(
            id=friend_user.user_id,
            nickname=friend_user.nickname or friend_user.display_name,
            games_played=friendship.games_played,
        )
        for friendship, friend_user in rows
    ]


async def play_together(session: AsyncSession, user_id: str, friend_id: str) -> PlayTogetherResponse:
    friendship = await _get_friendship(session, user_id, friend_id)
    reverse_friendship = await _get_friendship(session, friend_id, user_id)
    if friendship is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found")

    friendship.games_played += 1
    if reverse_friendship is not None:
        reverse_friendship.games_played += 1

    if friendship.games_played % 3 == 0:
        promocode = await issue_promocode(
            session,
            user_id=user_id,
            planet_id=PlanetCode.SOCIAL_RING.value,
        )
        session.add(
            Gift(
                user_id=user_id,
                friend_id=friend_id,
                promocode=promocode.code,
            )
        )
        await session.commit()
        return PlayTogetherResponse(gift=True, promocode=promocode.code)

    await session.commit()
    return PlayTogetherResponse(gift=False)
