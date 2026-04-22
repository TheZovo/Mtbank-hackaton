from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from common.enums import GameCode, PlanetCode


class GameRunSubmitRequest(BaseModel):
    score: int


class GameRunOut(BaseModel):
    run_id: str
    game_code: GameCode
    planet_code: PlanetCode
    score: int
    base_reward: int
    total_reward: int
    bonus_breakdown: dict
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
