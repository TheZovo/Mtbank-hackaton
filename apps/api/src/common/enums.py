from enum import StrEnum


class PlanetCode(StrEnum):
    ORBIT_COMMERCE = "ORBIT_COMMERCE"
    CREDIT_SHIELD = "CREDIT_SHIELD"
    SOCIAL_RING = "SOCIAL_RING"


class GameCode(StrEnum):
    HALVA_SNAKE = "halva_snake"
    CREDIT_SHIELD_REACTOR = "credit_shield_reactor"
    SOCIAL_RING_SIGNAL = "social_ring_signal"


class SegmentKey(StrEnum):
    STUDENT = "student"
    FIRST_JOBBER = "first-jobber"
    FREELANCER = "freelancer"


class QuestStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CLAIMED = "claimed"


class BoosterStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"


class RewardStatus(StrEnum):
    CONFIRMED = "confirmed"


class ReferralState(StrEnum):
    INVITED = "invited"

