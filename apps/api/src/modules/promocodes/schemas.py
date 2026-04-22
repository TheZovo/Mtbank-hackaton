from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PromoCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    promocode_id: str
    user_id: str
    planet_id: str
    code: str
    issued_at: datetime
    used_at: datetime | None = None
