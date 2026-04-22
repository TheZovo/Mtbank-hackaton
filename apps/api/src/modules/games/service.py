from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import GameRun, User
from modules.games.schemas import GameRunOut, GameSummaryItemOut, GameSummaryOut
from modules.progression.service import apply_game_run


async def submit_game_run(session: AsyncSession, user: User, game_code: str, score: int) -> GameRunOut:
    run = await apply_game_run(session, user=user, game_code=game_code, score=score)
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
        created_at=run.created_at,
    )


async def get_game_summary(session: AsyncSession, user: User) -> GameSummaryOut:
    runs = (
        await session.scalars(
            select(GameRun).where(GameRun.user_id == user.user_id).order_by(GameRun.game_code, GameRun.created_at)
        )
    ).all()

    grouped: dict[tuple[str, str], dict] = defaultdict(
        lambda: {
            "runs": 0,
            "best_score": 0,
            "total_reward": 0,
            "total_cashback": 0.0,
            "total_bonus_points": 0,
        }
    )
    for run in runs:
        key = (run.game_code, run.planet_code)
        item = grouped[key]
        item["runs"] += 1
        item["best_score"] = max(item["best_score"], run.score)
        item["total_reward"] += int(run.total_reward)
        item["total_cashback"] += float((run.bonus_breakdown or {}).get("cashback_gain", 0))
        item["total_bonus_points"] += int((run.bonus_breakdown or {}).get("bonus_points_gain", 0))

    games = [
        GameSummaryItemOut(
            game_code=game_code,
            planet_code=planet_code,
            runs=payload["runs"],
            best_score=payload["best_score"],
            total_reward=payload["total_reward"],
            total_cashback=round(payload["total_cashback"], 1),
            total_bonus_points=payload["total_bonus_points"],
        )
        for (game_code, planet_code), payload in sorted(grouped.items())
    ]
    return GameSummaryOut(
        total_runs=sum(item.runs for item in games),
        total_reward=sum(item.total_reward for item in games),
        total_cashback=round(sum(item.total_cashback for item in games), 1),
        total_bonus_points=sum(item.total_bonus_points for item in games),
        games=games,
    )
