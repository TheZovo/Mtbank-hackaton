from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import GameAttempt, GameRun, User
from modules.games.schemas import GameRunOut, GameSummaryItemOut, GameSummaryOut
from modules.planets.config import DAILY_GAME_ATTEMPT_LIMIT
from modules.planets.service import build_planet_progress
from modules.progression.service import apply_game_run


async def consume_daily_attempt(session: AsyncSession, user_id: str) -> GameAttempt:
    today = date.today()
    attempt = await session.scalar(
        select(GameAttempt)
        .where(GameAttempt.user_id == user_id, GameAttempt.date == today)
        .with_for_update()
    )
    if attempt is None:
        attempt = GameAttempt(user_id=user_id, date=today, attempts_used=0)
        session.add(attempt)
        await session.flush()
    if attempt.attempts_used >= DAILY_GAME_ATTEMPT_LIMIT:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Лимит попыток на сегодня исчерпан")
    attempt.attempts_used += 1
    await session.flush()
    return attempt


async def submit_game_run(session: AsyncSession, user: User, game_code: str, score: int, planet_id: str | None) -> GameRunOut:
    attempt = await consume_daily_attempt(session, user.user_id)
    run = await apply_game_run(session, user=user, game_code=game_code, score=score, planet_id=planet_id)
    planet_progress = await build_planet_progress(session, user, run.planet_code)
    await session.commit()
    await session.refresh(run)
    return GameRunOut(
        run_id=run.run_id,
        game_code=run.game_code,
        planet_code=run.planet_code,
        score=run.score,
        base_reward=run.base_reward,
        total_reward=run.total_reward,
        bonus_breakdown=run.bonus_breakdown,
        small_star_awarded=True,
        remaining_attempts_today=max(DAILY_GAME_ATTEMPT_LIMIT - attempt.attempts_used, 0),
        planet_progress=planet_progress,
        created_at=run.created_at,
    )


async def get_game_summary(session: AsyncSession, user: User) -> GameSummaryOut:
    rows = (
        await session.execute(
            select(
                GameRun.game_code,
                GameRun.planet_code,
                func.count(GameRun.run_id),
                func.max(GameRun.score),
                func.coalesce(func.sum(GameRun.total_reward), 0),
            )
            .where(GameRun.user_id == user.user_id)
            .group_by(GameRun.game_code, GameRun.planet_code)
            .order_by(GameRun.game_code)
        )
    ).all()
    games = [
        GameSummaryItemOut(
            game_code=game_code,
            planet_code=planet_code,
            runs=int(runs),
            best_score=int(best_score or 0),
            total_reward=int(total_reward or 0),
        )
        for game_code, planet_code, runs, best_score, total_reward in rows
    ]
    return GameSummaryOut(
        total_runs=sum(item.runs for item in games),
        total_reward=sum(item.total_reward for item in games),
        games=games,
    )
