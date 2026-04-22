from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from common.enums import PlanetCode, SegmentKey


class UserSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    phone: str
    display_name: str
    segment: SegmentKey
    created_at: datetime


class PlanetProgressOut(BaseModel):
    planet_code: PlanetCode
    xp: int
    level: int
    mastery: int


class BoosterWindowOut(BaseModel):
    booster_id: str
    category: str
    boost_rate: float
    start_at: datetime
    end_at: datetime
    status: str


class QuestOut(BaseModel):
    quest_id: str
    title: str
    description: str
    planet_code: PlanetCode
    condition_type: str
    threshold: float
    reward_kind: str
    reward_value: float
    status: str
    current_value: float


class RewardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ledger_id: str
    reward_type: str
    amount: float
    status: str
    created_at: datetime
    meta: dict


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: str
    title: str
    detail: str
    reward: int
    planet_code: PlanetCode | None
    created_at: datetime


class InstallmentProfileOut(BaseModel):
    current_limit: float
    available_limit: float
    risk_score: int
    on_time_payments_3m: int
    late_flags: int


class GalaxyProfileResponse(BaseModel):
    user: UserSummaryOut
    orbit_level: int
    total_energy: int
    total_xp: int
    stardust: int
    bonus_streak: int
    vault_charge: int
    vault_crates: int
    selected_planet: PlanetCode
    planets: list[PlanetProgressOut]
    active_boosters: list[BoosterWindowOut]
    quests: list[QuestOut]
    reward_ledger_preview: list[RewardOut]
    activity: list[ActivityOut]
    installment_profile: InstallmentProfileOut


class FocusPlanetRequest(BaseModel):
    planet_code: PlanetCode


class MeResponse(BaseModel):
    user: UserSummaryOut
    selected_planet: PlanetCode
