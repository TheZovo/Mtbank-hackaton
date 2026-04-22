from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User, UserProfile
from modules.profile.schemas import UserSummaryOut


async def get_leaderboard(session: AsyncSession) -> list[dict]:
    rows = (
        await session.execute(
            select(User, UserProfile)
            .join(UserProfile, User.user_id == UserProfile.user_id)
            .order_by(desc(UserProfile.total_xp), desc(UserProfile.orbit_level))
            .limit(20)
        )
    ).all()
    return [
        {
            "user_id": user.user_id,
            "display_name": user.display_name,
            "orbit_level": profile.orbit_level,
            "total_xp": profile.total_xp,
        }
        for user, profile in rows
    ]
