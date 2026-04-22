from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import GameAttempt, User, UserProfile
from modules.planets.config import DAILY_GAME_ATTEMPT_LIMIT, PLANET_CONFIGS, get_constellation, get_planet_config, progress_percent
from modules.planets.schemas import (
    ConstellationOut,
    FocusPlanetResponse,
    PlanetGameOut,
    PlanetListItemOut,
    PlanetProgressOut,
)
from modules.progression.service import ensure_all_planet_states, ensure_planet_state


async def get_today_attempts(session: AsyncSession, user_id: str) -> int:
    attempt = await session.scalar(
        select(GameAttempt).where(GameAttempt.user_id == user_id, GameAttempt.date == date.today())
    )
    return attempt.attempts_used if attempt else 0


async def list_planets(session: AsyncSession, user: User) -> list[PlanetListItemOut]:
    states = {state.planet_code: state for state in await ensure_all_planet_states(session, user.user_id)}
    return [
        PlanetListItemOut(
            id=config.id,
            name=config.name,
            cashback_percent=states[config.id].cashback_percent,
            progress_percent=progress_percent(
                current_big_star=states[config.id].current_big_star,
                small_stars_current=states[config.id].small_stars_current,
                constellation=get_constellation(config, states[config.id].constellation_index),
            ),
        )
        for config in PLANET_CONFIGS.values()
    ]


async def build_planet_progress(session: AsyncSession, user: User, planet_id: str) -> PlanetProgressOut:
    config = get_planet_config(planet_id)
    if config is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Планета не найдена")
    state = await ensure_planet_state(session, user.user_id, planet_id)
    constellation = get_constellation(config, state.constellation_index)
    attempts_used = await get_today_attempts(session, user.user_id)
    return PlanetProgressOut(
        planet_id=config.id,
        name=config.name,
        cashback_percent=state.cashback_percent,
        max_cashback_reached=state.max_cashback_reached,
        constellation=ConstellationOut(
            name=constellation.name,
            index=state.constellation_index,
            big_stars=constellation.big_stars,
            current_big_star=state.current_big_star,
            small_stars_current=state.small_stars_current,
            small_stars_required=constellation.small_stars_per_segment,
            big_stars_state=[index < state.current_big_star for index in range(constellation.big_stars)],
            small_stars_state=[index < state.small_stars_current for index in range(constellation.small_stars_per_segment)],
        ),
        period_small_stars=state.small_stars_period_counter,
        big_stars_until_increase=max(constellation.big_stars - state.current_big_star, 0),
        game=PlanetGameOut(
            code=config.game.code,
            name=config.game.name,
            attempts_used=attempts_used,
            attempts_limit=DAILY_GAME_ATTEMPT_LIMIT,
        ),
    )


async def set_focus_planet(session: AsyncSession, user: User, planet_id: str, focus: bool) -> FocusPlanetResponse:
    if not focus:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Поддерживается только focus=true")
    if get_planet_config(planet_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Планета не найдена")
    profile = await session.get(UserProfile, user.user_id)
    profile.focus_planet_id = planet_id
    profile.selected_planet = planet_id
    await session.commit()
    return FocusPlanetResponse(planet_id=planet_id, focus=True)
