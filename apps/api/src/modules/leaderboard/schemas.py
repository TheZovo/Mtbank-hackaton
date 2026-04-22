from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PlanetLeaderboardItemOut(BaseModel):
    rank: int
    user_id: str
    display_name: str
    small_stars: int
    is_current_user: bool = False


class PlanetLeaderboardOut(BaseModel):
    planet_id: str
    period: str
    period_ends_at: datetime
    top: list[PlanetLeaderboardItemOut]
    current_user_rank: int | None
