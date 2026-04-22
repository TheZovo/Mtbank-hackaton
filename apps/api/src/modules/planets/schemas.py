from __future__ import annotations

from pydantic import BaseModel


class PlanetListItemOut(BaseModel):
    id: str
    name: str
    cashback_percent: float
    progress_percent: float


class FocusPlanetRequest(BaseModel):
    focus: bool


class FocusPlanetResponse(BaseModel):
    planet_id: str
    focus: bool


class ConstellationOut(BaseModel):
    name: str
    index: int
    big_stars: int
    current_big_star: int
    small_stars_current: int
    small_stars_required: int
    big_stars_state: list[bool]
    small_stars_state: list[bool]


class PlanetGameOut(BaseModel):
    code: str
    name: str
    attempts_used: int
    attempts_limit: int


class PlanetProgressOut(BaseModel):
    planet_id: str
    name: str
    cashback_percent: float
    max_cashback_reached: bool
    constellation: ConstellationOut
    period_small_stars: int
    big_stars_until_increase: int
    game: PlanetGameOut
