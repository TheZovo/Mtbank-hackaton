from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from common.enums import GameCode, PlanetCode
from modules.planets.schemas import PlanetProgressOut


class GameRunSubmitRequest(BaseModel):
    score: int
    planet_id: str | None = None


class GameRunOut(BaseModel):
    run_id: str
    game_code: GameCode
    planet_code: PlanetCode
    score: int
    base_reward: int
    total_reward: int
    bonus_breakdown: dict
    small_star_awarded: bool
    remaining_attempts_today: int
    planet_progress: PlanetProgressOut
    created_at: datetime


class GameSummaryItemOut(BaseModel):
    game_code: GameCode
    planet_code: PlanetCode
    runs: int
    best_score: int
    total_reward: int


class GameSummaryOut(BaseModel):
    total_runs: int
    total_reward: int
    games: list[GameSummaryItemOut]
