from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ActivityLog, BoosterWindow, PlanetState, Quest, QuestProgress, RewardLedger, User, UserProfile
from modules.profile.schemas import (
    ActivityOut,
    BoosterWindowOut,
    GalaxyProfileResponse,
    InstallmentProfileOut,
    MeResponse,
    PlanetProgressOut,
    QuestOut,
    RewardOut,
    UserSummaryOut,
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
            .order_by(Quest.planet_code, Quest.quest_id)
        )
    ).all()
    reward_preview = (
        await session.scalars(
            select(RewardLedger).where(RewardLedger.user_id == user.user_id).order_by(desc(RewardLedger.created_at)).limit(5)
        )
    ).all()
    activity = (
        await session.scalars(
            select(ActivityLog).where(ActivityLog.user_id == user.user_id).order_by(desc(ActivityLog.created_at)).limit(6)
        )
    ).all()

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
        quests=[
            QuestOut(
                quest_id=quest.quest_id,
                title=quest.title,
                description=quest.description,
                planet_code=quest.planet_code,
                condition_type=quest.condition_type,
                threshold=quest.threshold,
                reward_kind=quest.reward_kind,
                reward_value=quest.reward_value,
                status=progress.status,
                current_value=progress.current_value,
            )
            for quest, progress in quest_rows
        ],
        reward_ledger_preview=[RewardOut.model_validate(item, from_attributes=True) for item in reward_preview],
        activity=[ActivityOut.model_validate(item, from_attributes=True) for item in activity],
        installment_profile=InstallmentProfileOut(
            current_limit=profile.current_limit,
            available_limit=profile.available_limit,
            risk_score=profile.risk_score,
            on_time_payments_3m=profile.on_time_payments_3m,
            late_flags=profile.late_flags,
        ),
    )
