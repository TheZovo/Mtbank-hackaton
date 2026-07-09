from __future__ import annotations

from pydantic import BaseModel


class EndPeriodPlanetOut(BaseModel):
    planet_id: str
    winners: int
    period_id: str


class EndPeriodResponse(BaseModel):
    status: str
    period_type: str
    planets: list[EndPeriodPlanetOut]
