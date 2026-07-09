from __future__ import annotations

import json
from datetime import timedelta

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import utcnow
from db.models import LeaderboardPeriod, PlanetState, User
from modules.admin.schemas import EndPeriodPlanetOut, EndPeriodResponse
from modules.planets.config import PLANET_CONFIGS
from modules.progression.service import apply_daily_degradation, issue_promocode_request


async def end_period(session: AsyncSession, *, cache, period_type: str = "week") -> EndPeriodResponse:
    now = utcnow()
    start = now - timedelta(days=7)
    result: list[EndPeriodPlanetOut] = []

    for planet_id in PLANET_CONFIGS:
        rows = (
            await session.execute(
                select(User, PlanetState)
                .join(PlanetState, PlanetState.user_id == User.user_id)
                .where(PlanetState.planet_code == planet_id)
                .order_by(desc(PlanetState.small_stars_period_counter), User.user_id)
                .limit(10)
            )
        ).all()
        winners = [
            {
                "rank": index + 1,
                "user_id": user.user_id,
                "display_name": user.display_name,
                "small_stars": state.small_stars_period_counter,
            }
            for index, (user, state) in enumerate(rows)
        ]
        for winner in winners:
            await issue_promocode_request(
                session,
                user_id=winner["user_id"],
                planet_id=planet_id,
                reason=f"{period_type}_leaderboard_top_10",
            )
        period = LeaderboardPeriod(
            planet_id=planet_id,
            period_type=period_type,
            start_date=start,
            end_date=now,
            snapshot=json.dumps({"planet_id": planet_id, "winners": winners}, ensure_ascii=False),
        )
        session.add(period)
        await session.flush()
        result.append(EndPeriodPlanetOut(planet_id=planet_id, winners=len(winners), period_id=period.period_id))

    states = (await session.scalars(select(PlanetState).with_for_update())).all()
    for state in states:
        state.small_stars_period_counter = 0
    await cache.delete_prefix("leaderboard:")
    await session.commit()
    return EndPeriodResponse(status="ok", period_type=period_type, planets=result)


async def run_daily_degradation(session: AsyncSession) -> dict:
    result = await apply_daily_degradation(session)
    await session.commit()
    return result
