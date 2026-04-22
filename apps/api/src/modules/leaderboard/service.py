from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User, UserProfile
from modules.profile.schemas import LeaderboardEntryOut


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
