from __future__ import annotations

import json
from dataclasses import asdict
from datetime import date, timedelta
from math import floor, sqrt

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from common.enums import GameCode, PlanetCode, QuestStatus, SegmentKey
from core.security import BonusBreakdown, generate_id, make_display_name, utcnow
from db.models import (
    ActivityLog,
    BoosterWindow,
    GameRun,
    MccToPlanet,
    PlanetState,
    Quest,
    QuestProgress,
    Referral,
    RewardLedger,
    User,
    UserProfile,
)
from modules.planets.config import CASHBACK_INCREMENT, PLANET_CONFIGS, get_constellation, get_planet_config


PLANET_WEIGHTS = {
    PlanetCode.ORBIT_COMMERCE.value: 1.0,
    PlanetCode.CREDIT_SHIELD.value: 1.2,
    PlanetCode.SOCIAL_RING.value: 0.8,
}

GAME_PLANET_MAP = {
    GameCode.HALVA_SNAKE.value: PlanetCode.ORBIT_COMMERCE.value,
    GameCode.CREDIT_SHIELD_REACTOR.value: PlanetCode.CREDIT_SHIELD.value,
    GameCode.SOCIAL_RING_SIGNAL.value: PlanetCode.SOCIAL_RING.value,
}

PROMOCODE_SOURCE = "be2_promocode_request"

DEFAULT_QUESTS = (
    {
        "quest_id": "quest_orbit_001",
        "title": "Разогрев орбиты",
        "description": "Завершите 3 забега в Змейке Халва.",
        "planet_code": PlanetCode.ORBIT_COMMERCE.value,
        "condition_type": "game_runs_halva_snake",
        "threshold": 3,
        "reward_kind": "booster",
        "reward_value": 2,
    },
    {
        "quest_id": "quest_credit_001",
        "title": "Точность щита",
        "description": "Наберите суммарно 12 очков в Реакторе щита.",
        "planet_code": PlanetCode.CREDIT_SHIELD.value,
        "condition_type": "game_score_credit_shield",
        "threshold": 12,
        "reward_kind": "limit_boost",
        "reward_value": 25,
    },
    {
        "quest_id": "quest_social_001",
        "title": "Первый контакт",
        "description": "Пригласите одного друга в MTB Galaxy.",
        "planet_code": PlanetCode.SOCIAL_RING.value,
        "condition_type": "referral_invites",
        "threshold": 1,
        "reward_kind": "stardust",
        "reward_value": 12,
    },
    {
        "quest_id": "quest_orbit_002",
        "title": "Пылевой рывок",
        "description": "Заработайте 80 единиц звездной пыли.",
        "planet_code": PlanetCode.ORBIT_COMMERCE.value,
        "condition_type": "stardust_earned",
        "threshold": 80,
        "reward_kind": "stardust",
        "reward_value": 20,
    },
)


def level_from_xp(xp: int) -> int:
    if xp <= 0:
        return 1
    return max(1, floor(sqrt(xp / 18)) + 1)


def get_game_base_reward(game_code: str, score: int) -> int:
    if game_code == GameCode.HALVA_SNAKE.value:
        return max(4, score * 3)
    if game_code == GameCode.CREDIT_SHIELD_REACTOR.value:
        return max(5, score * 2)
    return max(6, floor(score * 1.8))


def calculate_bonus(
    *,
    profile: UserProfile,
    planet_state: PlanetState,
    planet_code: str,
    base_reward: int,
    performance_score: int,
) -> BonusBreakdown:
    next_streak = min(profile.bonus_streak + 1, 7)
    streak_bonus = round(base_reward * min((next_streak - 1) * 0.06, 0.36))
    mastery_bonus = round(base_reward * min(planet_state.mastery * 0.04, 0.42))
    performance_bonus = min(12, performance_score // 4)
    focus_bonus = 2 if profile.selected_planet == planet_code else 0
    total_reward = base_reward + streak_bonus + mastery_bonus + performance_bonus + focus_bonus
    charge_gain = max(8, round(total_reward * 2.4))
    next_charge = profile.vault_charge + charge_gain
    crates_earned = next_charge // 100
    return BonusBreakdown(
        base_reward=base_reward,
        streak_bonus=streak_bonus,
        mastery_bonus=mastery_bonus,
        performance_bonus=performance_bonus,
        focus_bonus=focus_bonus,
        total_reward=total_reward,
        charge_gain=charge_gain,
        crates_earned=crates_earned,
        next_vault_charge=next_charge % 100,
        next_streak=next_streak,
        next_mastery=min(planet_state.mastery + 1, 12),
    )


async def seed_quest_catalog(session: AsyncSession) -> None:
    existing = {
        quest.quest_id: quest
        for quest in (await session.scalars(select(Quest))).all()
    }
    for payload in DEFAULT_QUESTS:
        quest = existing.get(payload["quest_id"])
        if quest is None:
            session.add(Quest(**payload))
            continue
        for key, value in payload.items():
            setattr(quest, key, value)
    await session.flush()


async def seed_mcc_to_planet(session: AsyncSession) -> None:
    for planet in PLANET_CONFIGS.values():
        for mcc_code in planet.mcc_codes:
            existing = await session.get(MccToPlanet, mcc_code)
            if existing is None:
                session.add(MccToPlanet(mcc_code=mcc_code, planet_id=planet.id, description=planet.name))
            else:
                existing.planet_id = planet.id
                existing.description = planet.name
    await session.flush()


async def ensure_quest_progress(session: AsyncSession, user_id: str) -> None:
    quest_ids = list((await session.scalars(select(Quest.quest_id))).all())
    existing = {
        quest_id
        for quest_id in (
            await session.scalars(select(QuestProgress.quest_id).where(QuestProgress.user_id == user_id))
        ).all()
    }
    for quest_id in quest_ids:
        if quest_id not in existing:
            session.add(QuestProgress(user_id=user_id, quest_id=quest_id))
    await session.flush()


async def provision_user(
    session: AsyncSession,
    *,
    phone: str,
    display_name: str | None,
    segment: SegmentKey | None,
) -> User:
    existing = await session.scalar(select(User).where(User.phone == phone))
    if existing is not None:
        if display_name and existing.display_name != display_name:
            existing.display_name = display_name
        if segment and existing.segment != segment.value:
            existing.segment = segment.value
        await seed_quest_catalog(session)
        await ensure_quest_progress(session, existing.user_id)
        await session.flush()
        return existing

    user = User(
        phone=phone,
        display_name=display_name or make_display_name(phone),
        segment=(segment or SegmentKey.STUDENT).value,
    )
    session.add(user)
    await session.flush()
    session.add(UserProfile(user_id=user.user_id))
    for planet_code in PlanetCode:
        config = get_planet_config(planet_code.value)
        session.add(
            PlanetState(
                user_id=user.user_id,
                planet_code=planet_code.value,
                cashback_percent=config.cashback_start if config else 0,
            )
        )
    await seed_quest_catalog(session)
    await ensure_quest_progress(session, user.user_id)
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title="Добро пожаловать в MTB Galaxy",
            detail="Профиль создан и готов к первому запуску мини-игр.",
            reward=0,
            planet_code=None,
        )
    )
    await session.flush()
    return user


async def refresh_rollup(session: AsyncSession, user_id: str) -> None:
    profile = await session.get(UserProfile, user_id)
    planets = (
        await session.scalars(select(PlanetState).where(PlanetState.user_id == user_id))
    ).all()
    profile.total_xp = sum(item.xp for item in planets)
    weighted = sum(item.level * PLANET_WEIGHTS.get(item.planet_code, 1.0) for item in planets)
    profile.orbit_level = max(1, floor(weighted))


async def update_quest_progress(session: AsyncSession, user_id: str, condition_type: str, increment: float) -> None:
    quests = (
        await session.scalars(
            select(Quest).where(Quest.condition_type == condition_type, Quest.active.is_(True))
        )
    ).all()
    if not quests:
        return

    for quest in quests:
        progress = await session.scalar(
            select(QuestProgress).where(QuestProgress.user_id == user_id, QuestProgress.quest_id == quest.quest_id)
        )
        if progress is None:
            progress = QuestProgress(user_id=user_id, quest_id=quest.quest_id)
            session.add(progress)
            await session.flush()
        if progress.status == QuestStatus.CLAIMED.value:
            continue
        progress.current_value += increment
        progress.status = (
            QuestStatus.COMPLETED.value if progress.current_value >= quest.threshold else QuestStatus.ACTIVE.value
        )


async def get_planet_state(session: AsyncSession, user_id: str, planet_code: str) -> PlanetState:
    planet_state = await session.scalar(
        select(PlanetState).where(PlanetState.user_id == user_id, PlanetState.planet_code == planet_code)
    )
    if planet_state is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Планета не найдена")
    return planet_state


async def ensure_planet_state(session: AsyncSession, user_id: str, planet_id: str, *, for_update: bool = False) -> PlanetState:
    config = get_planet_config(planet_id)
    if config is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Планета не найдена")

    statement = select(PlanetState).where(PlanetState.user_id == user_id, PlanetState.planet_code == planet_id)
    if for_update:
        statement = statement.with_for_update()
    planet_state = await session.scalar(statement)
    if planet_state is None:
        planet_state = PlanetState(user_id=user_id, planet_code=planet_id, cashback_percent=config.cashback_start)
        session.add(planet_state)
        await session.flush()
    if planet_state.cashback_percent <= 0:
        planet_state.cashback_percent = config.cashback_start
    return planet_state


async def ensure_all_planet_states(session: AsyncSession, user_id: str) -> list[PlanetState]:
    states: list[PlanetState] = []
    for planet_id in PLANET_CONFIGS:
        states.append(await ensure_planet_state(session, user_id, planet_id))
    await session.flush()
    return states


async def issue_promocode_request(
    session: AsyncSession,
    *,
    user_id: str,
    planet_id: str,
    reason: str,
) -> None:
    session.add(
        RewardLedger(
            user_id=user_id,
            reward_type=PROMOCODE_SOURCE,
            amount=0,
            status="pending",
            meta={"planet_id": planet_id, "reason": reason, "provider": "BE1"},
        )
    )


async def add_small_star(
    session: AsyncSession,
    *,
    user_id: str,
    planet_id: str,
    source: str,
) -> PlanetState:
    config = get_planet_config(planet_id)
    if config is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Планета не найдена")

    planet_state = await ensure_planet_state(session, user_id, planet_id, for_update=True)
    constellation = get_constellation(config, planet_state.constellation_index)

    planet_state.small_stars_current += 1
    planet_state.small_stars_period_counter += 1
    if source == "game":
        planet_state.last_game_win_date = date.today()

    if planet_state.small_stars_current >= constellation.small_stars_per_segment:
        planet_state.small_stars_current = 0
        planet_state.current_big_star += 1

    if planet_state.current_big_star >= constellation.big_stars:
        planet_state.current_big_star = 0
        planet_state.small_stars_current = 0
        planet_state.total_constellations_completed += 1
        planet_state.constellation_index = min(
            planet_state.constellation_index + 1,
            len(config.constellations) - 1,
        )
        if planet_state.cashback_percent < config.cashback_max:
            planet_state.cashback_percent = min(config.cashback_max, planet_state.cashback_percent + CASHBACK_INCREMENT)
        planet_state.max_cashback_reached = planet_state.cashback_percent >= config.cashback_max
        await issue_promocode_request(
            session,
            user_id=user_id,
            planet_id=planet_id,
            reason="constellation_completed",
        )

    session.add(
        RewardLedger(
            user_id=user_id,
            reward_type="small_star",
            amount=1,
            status="confirmed",
            meta={"planet_id": planet_id, "source": source},
        )
    )
    await session.flush()
    return planet_state


async def apply_daily_degradation(session: AsyncSession, today: date | None = None) -> dict:
    current_date = today or date.today()
    threshold = current_date - timedelta(days=5)
    states = (
        await session.scalars(
            select(PlanetState)
            .where(PlanetState.last_game_win_date.is_not(None), PlanetState.last_game_win_date < threshold)
            .with_for_update()
        )
    ).all()

    degraded = 0
    for state in states:
        if state.small_stars_current > 0:
            state.small_stars_current -= 1
            degraded += 1
        elif state.current_big_star > 0:
            state.current_big_star -= 1
            state.small_stars_current = 0
            degraded += 1
    await session.flush()
    return {"status": "ok", "degraded_planets": degraded}


async def apply_game_run(session: AsyncSession, *, user: User, game_code: str, score: int, planet_id: str | None = None) -> GameRun:
    if game_code not in GAME_PLANET_MAP:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестная игра")
    if score < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Счет не может быть отрицательным")

    profile = await session.get(UserProfile, user.user_id)
    planet_code = planet_id or GAME_PLANET_MAP[game_code]
    if get_planet_config(planet_code) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Планета не найдена")
    if GAME_PLANET_MAP[game_code] != planet_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Игра не соответствует планете")
    planet_state = await ensure_planet_state(session, user.user_id, planet_code, for_update=True)
    base_reward = get_game_base_reward(game_code, score)
    bonus = calculate_bonus(
        profile=profile,
        planet_state=planet_state,
        planet_code=planet_code,
        base_reward=base_reward,
        performance_score=score,
    )

    profile.stardust += bonus.total_reward
    profile.bonus_streak = bonus.next_streak
    profile.vault_charge = bonus.next_vault_charge
    profile.vault_crates += bonus.crates_earned
    profile.total_energy += max(6, bonus.charge_gain)

    xp_gain = max(base_reward, score * 4 + 8)
    planet_state.xp += xp_gain
    planet_state.level = level_from_xp(planet_state.xp)
    planet_state.mastery = bonus.next_mastery

    run = GameRun(
        user_id=user.user_id,
        game_code=game_code,
        planet_code=planet_code,
        score=score,
        base_reward=bonus.base_reward,
        total_reward=bonus.total_reward,
        bonus_breakdown=asdict(bonus),
    )
    session.add(run)
    session.add(
        RewardLedger(
            user_id=user.user_id,
            reward_type="mini_game_stardust",
            amount=bonus.total_reward,
            status="confirmed",
            meta={"game_code": game_code, "score": score, "planet_code": planet_code},
        )
    )
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title=f"Завершен раунд {game_code}",
            detail=f"Счет {score}, награда {bonus.total_reward} звездной пыли.",
            reward=bonus.total_reward,
            planet_code=planet_code,
        )
    )

    if game_code == GameCode.HALVA_SNAKE.value:
        await update_quest_progress(session, user.user_id, "game_runs_halva_snake", 1)
    if game_code == GameCode.CREDIT_SHIELD_REACTOR.value:
        await update_quest_progress(session, user.user_id, "game_score_credit_shield", score)
    await update_quest_progress(session, user.user_id, "stardust_earned", bonus.total_reward)
    await add_small_star(session, user_id=user.user_id, planet_id=planet_code, source="game")
    await refresh_rollup(session, user.user_id)
    await session.flush()
    return run


async def claim_quest_reward(session: AsyncSession, *, user: User, quest_id: str) -> RewardLedger:
    progress = await session.scalar(
        select(QuestProgress).where(QuestProgress.user_id == user.user_id, QuestProgress.quest_id == quest_id)
    )
    quest = await session.get(Quest, quest_id)
    if progress is None or quest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Квест не найден")
    if progress.status != QuestStatus.COMPLETED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Квест еще не готов к получению награды")

    profile = await session.get(UserProfile, user.user_id)
    reward_amount = quest.reward_value
    if quest.reward_kind == "booster":
        session.add(
            BoosterWindow(
                user_id=user.user_id,
                category="quest_booster",
                boost_rate=quest.reward_value,
                start_at=utcnow(),
                end_at=utcnow() + timedelta(hours=24),
            )
        )
    elif quest.reward_kind == "limit_boost":
        profile.current_limit += quest.reward_value
        profile.available_limit += quest.reward_value
    elif quest.reward_kind == "stardust":
        profile.stardust += int(quest.reward_value)

    progress.status = QuestStatus.CLAIMED.value
    progress.claimed_at = utcnow()
    ledger = RewardLedger(
        user_id=user.user_id,
        reward_type=f"quest_{quest.reward_kind}",
        amount=reward_amount,
        status="confirmed",
        meta={"quest_id": quest.quest_id, "planet_code": quest.planet_code},
    )
    session.add(ledger)
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title=f"Получена награда за {quest.title}",
            detail=f"Квест закрыт, выдана награда типа {quest.reward_kind}.",
            reward=int(reward_amount),
            planet_code=quest.planet_code,
        )
    )
    await session.flush()
    return ledger


async def create_referral_reward(session: AsyncSession, *, user: User, invitee_phone: str) -> Referral:
    existing = await session.scalar(
        select(Referral).where(Referral.inviter_user_id == user.user_id, Referral.invitee_phone == invitee_phone)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Такой реферал уже создан")
    if invitee_phone == user.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Нельзя пригласить свой номер")

    referral = Referral(
        inviter_user_id=user.user_id,
        invitee_phone=invitee_phone,
        invite_code=generate_id("invite").split("_", maxsplit=1)[1].upper(),
    )
    profile = await session.get(UserProfile, user.user_id)
    planet_state = await get_planet_state(session, user.user_id, PlanetCode.SOCIAL_RING.value)

    profile.stardust += 6
    profile.total_energy += 4
    planet_state.xp += 28
    planet_state.level = level_from_xp(planet_state.xp)

    session.add(referral)
    session.add(
        RewardLedger(
            user_id=user.user_id,
            reward_type="referral_bonus",
            amount=6,
            status="confirmed",
            meta={"invitee_phone": invitee_phone},
        )
    )
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title="Отправлено приглашение другу",
            detail=f"Приглашение отправлено на номер {invitee_phone}.",
            reward=6,
            planet_code=PlanetCode.SOCIAL_RING.value,
        )
    )
    await update_quest_progress(session, user.user_id, "referral_invites", 1)
    await update_quest_progress(session, user.user_id, "stardust_earned", 6)
    await refresh_rollup(session, user.user_id)
    await session.flush()
    return referral
