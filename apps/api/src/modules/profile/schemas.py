from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field

from common.enums import ConstellationCode, PlanetCode, SegmentKey


class UserSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    phone: str
    display_name: str
    segment: SegmentKey
    created_at: datetime

    @computed_field(return_type=str)
    @property
    def id(self) -> str:
        return self.user_id

    @computed_field(return_type=str)
    @property
    def name(self) -> str:
        return self.display_name


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
    category: str
    condition_type: str
    threshold: float
    reward_kind: str
    reward_value: float
    reward_display: str
    stars_reward: int
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
    title: str
    description: str


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


class WalletOut(BaseModel):
    cashback_balance: float
    bonus_points: int
    rating_boost: int
    total_energy: int
    vault_charge: int
    vault_crates: int


class RatingOverviewOut(BaseModel):
    rating_score: int
    bank_rank: str
    total_stars: int
    orbit_level: int
    completed_quests: int


class QuestSummaryOut(BaseModel):
    active: int
    completed: int
    claimed: int


class ConstellationOut(BaseModel):
    constellation_code: ConstellationCode
    title: str
    theme: str
    headline: str
    accent: str
    planet_code: PlanetCode
    stars_filled: int
    total_stars: int
    completion_ratio: float
    next_goal: str


class LeaderboardEntryOut(BaseModel):
    user_id: str
    display_name: str
    orbit_level: int
    total_xp: int
    rating_score: int
    bank_rank: str
    total_stars: int
    cashback_balance: float


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
    rating: RatingOverviewOut
    wallet: WalletOut
    quest_summary: QuestSummaryOut
    constellations: list[ConstellationOut]
    planets: list[PlanetProgressOut]
    active_boosters: list[BoosterWindowOut]
    quests: list[QuestOut]
    reward_ledger_preview: list[RewardOut]
    activity: list[ActivityOut]
    installment_profile: InstallmentProfileOut


class FocusPlanetRequest(BaseModel):
    planet_code: PlanetCode


class MeResponse(BaseModel):
    id: str
    phone: str
    name: str
    daily_game_attempts_used: int
    daily_game_attempts_limit: int
    user: UserSummaryOut
    selected_planet: PlanetCode
