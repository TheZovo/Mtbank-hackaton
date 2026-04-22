from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ActivityLog, BoosterWindow, PlanetState, Quest, QuestProgress, RewardLedger, User, UserProfile
from modules.profile.schemas import (
    ActivityOut,
    BoosterWindowOut,
    ConstellationOut,
    GalaxyProfileResponse,
    InstallmentProfileOut,
    MeResponse,
    PlanetProgressOut,
    QuestOut,
    QuestSummaryOut,
    RatingOverviewOut,
    RewardOut,
    UserSummaryOut,
    WalletOut,
)
from modules.progression.service import (
    describe_reward,
    get_reward_display,
    refresh_rollup,
)


def map_reward_entry(item: RewardLedger) -> RewardOut:
    title, description = describe_reward(item.reward_type, item.amount, item.meta or {})
    return RewardOut(
        ledger_id=item.ledger_id,
        reward_type=item.reward_type,
        amount=item.amount,
        status=item.status,
        created_at=item.created_at,
        meta=item.meta or {},
        title=title,
        description=description,
    )


def map_quest_entry(quest: Quest, progress: QuestProgress) -> QuestOut:
    return QuestOut(
        quest_id=quest.quest_id,
        title=quest.title,
        description=quest.description,
        planet_code=quest.planet_code,
        category=quest.category,
        condition_type=quest.condition_type,
        threshold=quest.threshold,
        reward_kind=quest.reward_kind,
        reward_value=quest.reward_value,
        reward_display=get_reward_display(quest.reward_kind, quest.reward_value),
        stars_reward=quest.stars_reward,
        status=progress.status,
        current_value=progress.current_value,
    )


async def build_me_response(session: AsyncSession, user: User) -> MeResponse:
    profile = await session.get(UserProfile, user.user_id)
    return MeResponse(
        user=UserSummaryOut.model_validate(user, from_attributes=True),
        selected_planet=profile.selected_planet,
    )


async def build_profile_response(session: AsyncSession, user: User) -> GalaxyProfileResponse:
    profile = await session.get(UserProfile, user.user_id)
    planets = (
        await session.scalars(
            select(PlanetState).where(PlanetState.user_id == user.user_id).order_by(PlanetState.planet_code)
        )
    ).all()
    boosters = (
        await session.scalars(
            select(BoosterWindow)
            .where(BoosterWindow.user_id == user.user_id, BoosterWindow.status == "active")
            .order_by(desc(BoosterWindow.end_at))
        )
    ).all()
    quest_rows = (
        await session.execute(
            select(Quest, QuestProgress)
            .join(QuestProgress, Quest.quest_id == QuestProgress.quest_id)
            .where(QuestProgress.user_id == user.user_id, Quest.active.is_(True))
            .order_by(Quest.display_order, Quest.quest_id)
        )
    ).all()
    reward_preview = (
        await session.scalars(
            select(RewardLedger).where(RewardLedger.user_id == user.user_id).order_by(desc(RewardLedger.created_at)).limit(6)
        )
    ).all()
    activity = (
        await session.scalars(
            select(ActivityLog).where(ActivityLog.user_id == user.user_id).order_by(desc(ActivityLog.created_at)).limit(8)
        )
    ).all()

    constellations = await refresh_rollup(session, user.user_id)
    quest_items = [map_quest_entry(quest, progress) for quest, progress in quest_rows]

    return GalaxyProfileResponse(
        user=UserSummaryOut.model_validate(user, from_attributes=True),
        orbit_level=profile.orbit_level,
        total_energy=profile.total_energy,
        total_xp=profile.total_xp,
        stardust=profile.stardust,
        bonus_streak=profile.bonus_streak,
        vault_charge=profile.vault_charge,
        vault_crates=profile.vault_crates,
        selected_planet=profile.selected_planet,
        rating=RatingOverviewOut(
            rating_score=profile.rating_score,
            bank_rank=profile.bank_rank,
            total_stars=profile.total_stars,
            orbit_level=profile.orbit_level,
            completed_quests=profile.completed_quests,
        ),
        wallet=WalletOut(
            cashback_balance=profile.cashback_balance,
            bonus_points=profile.bonus_points,
            rating_boost=profile.rating_boost,
            total_energy=profile.total_energy,
            vault_charge=profile.vault_charge,
            vault_crates=profile.vault_crates,
        ),
        quest_summary=QuestSummaryOut(
            active=sum(1 for item in quest_items if item.status == "active"),
            completed=sum(1 for item in quest_items if item.status == "completed"),
            claimed=sum(1 for item in quest_items if item.status == "claimed"),
        ),
        constellations=[ConstellationOut(**item) for item in constellations],
        planets=[
            PlanetProgressOut(
                planet_code=planet.planet_code,
                xp=planet.xp,
                level=planet.level,
                mastery=planet.mastery,
            )
            for planet in planets
        ],
        active_boosters=[BoosterWindowOut.model_validate(item, from_attributes=True) for item in boosters],
        quests=quest_items,
        reward_ledger_preview=[map_reward_entry(item) for item in reward_preview],
        activity=[ActivityOut.model_validate(item, from_attributes=True) for item in activity],
        installment_profile=InstallmentProfileOut(
            current_limit=profile.current_limit,
            available_limit=profile.available_limit,
            risk_score=profile.risk_score,
            on_time_payments_3m=profile.on_time_payments_3m,
            late_flags=profile.late_flags,
        ),
    )
