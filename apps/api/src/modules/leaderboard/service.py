from __future__ import annotations

from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import utcnow
from db.models import PlanetState, User, UserProfile
from modules.leaderboard.schemas import PlanetLeaderboardItemOut, PlanetLeaderboardOut
from modules.planets.config import get_planet_config
from modules.profile.schemas import LeaderboardEntryOut
from modules.progression.service import ensure_planet_state


async def get_leaderboard(session: AsyncSession) -> list[LeaderboardEntryOut]:
    rows = (
        await session.execute(
            select(User, UserProfile)
            .join(UserProfile, User.user_id == UserProfile.user_id)
            .order_by(desc(UserProfile.rating_score), desc(UserProfile.total_stars), desc(UserProfile.total_xp))
            .limit(20)
        )
    ).all()
    return [
        LeaderboardEntryOut(
            user_id=user.user_id,
            display_name=user.display_name,
            orbit_level=profile.orbit_level,
            total_xp=profile.total_xp,
            rating_score=profile.rating_score,
            bank_rank=profile.bank_rank,
            total_stars=profile.total_stars,
            cashback_balance=profile.cashback_balance,
        )
        for user, profile in rows
    ]


def get_week_period_end():
    now = utcnow()
    days_until_monday = (7 - now.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    return (now + timedelta(days=days_until_monday)).replace(hour=0, minute=0, second=0, microsecond=0)


async def _build_top(session: AsyncSession, planet_id: str) -> dict:
    rows = (
        await session.execute(
            select(User, PlanetState)
            .join(PlanetState, PlanetState.user_id == User.user_id)
            .where(PlanetState.planet_code == planet_id)
            .order_by(desc(PlanetState.small_stars_period_counter), User.user_id)
            .limit(50)
        )
    ).all()
    return {
        "top": [
            {
                "rank": index + 1,
                "user_id": user.user_id,
                "display_name": user.display_name,
                "small_stars": state.small_stars_period_counter,
            }
            for index, (user, state) in enumerate(rows)
        ],
        "period_ends_at": get_week_period_end().isoformat(),
    }


async def get_planet_leaderboard(
    session: AsyncSession,
    *,
    user: User,
    planet_id: str,
    period: str,
    cache,
) -> PlanetLeaderboardOut:
    if period != "week":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only period=week is supported")
    if get_planet_config(planet_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planet not found")

    cache_key = f"leaderboard:{period}:{planet_id}:top50"
    cached = await cache.get(cache_key)
    if cached is None:
        cached = await _build_top(session, planet_id)
        await cache.set(cache_key, cached, ttl_seconds=3600)

    current_state = await ensure_planet_state(session, user.user_id, planet_id)
    better_count = await session.scalar(
        select(func.count(PlanetState.planet_state_id)).where(
            PlanetState.planet_code == planet_id,
            or_(
                PlanetState.small_stars_period_counter > current_state.small_stars_period_counter,
                (
                    (PlanetState.small_stars_period_counter == current_state.small_stars_period_counter)
                    & (PlanetState.user_id < user.user_id)
                ),
            ),
        )
    )
    current_rank = int(better_count or 0) + 1
    top = [
        PlanetLeaderboardItemOut(
            **item,
            is_current_user=item["user_id"] == user.user_id,
        )
        for item in cached["top"]
    ]
    return PlanetLeaderboardOut(
        planet_id=planet_id,
        period=period,
        period_ends_at=cached["period_ends_at"],
        top=top,
        current_user_rank=current_rank,
    )
