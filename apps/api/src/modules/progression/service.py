from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict
from datetime import timedelta
from math import floor, sqrt

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from common.enums import ConstellationCode, GameCode, PlanetCode, QuestStatus, SegmentKey
from core.security import BonusBreakdown, generate_id, make_display_name, utcnow
from db.models import ActivityLog, BoosterWindow, GameRun, PlanetState, Quest, QuestProgress, Referral, RewardLedger, User, UserProfile


PLANET_WEIGHTS = {
    PlanetCode.ORBIT_COMMERCE.value: 1.0,
    PlanetCode.CREDIT_SHIELD.value: 1.18,
    PlanetCode.SOCIAL_RING.value: 0.92,
}

GAME_PLANET_MAP = {
    GameCode.HALVA_SNAKE.value: PlanetCode.ORBIT_COMMERCE.value,
    GameCode.CREDIT_SHIELD_REACTOR.value: PlanetCode.CREDIT_SHIELD.value,
    GameCode.SOCIAL_RING_SIGNAL.value: PlanetCode.SOCIAL_RING.value,
}

CONSTELLATION_META = {
    ConstellationCode.CASHBACK_COMET.value: {
        "title": "Cashback Comet",
        "theme": "Card activity, daily rewards and cashback growth.",
        "accent": "#FF7A59",
        "planet_code": PlanetCode.ORBIT_COMMERCE.value,
    },
    ConstellationCode.TRUST_ANCHOR.value: {
        "title": "Trust Anchor",
        "theme": "Credit discipline, stable limits and rating growth.",
        "accent": "#3B82F6",
        "planet_code": PlanetCode.CREDIT_SHIELD.value,
    },
    ConstellationCode.COMMUNITY_NOVA.value: {
        "title": "Community Nova",
        "theme": "Referrals, social quests and shared momentum.",
        "accent": "#14B8A6",
        "planet_code": PlanetCode.SOCIAL_RING.value,
    },
}

BANK_RANKS = (
    (900, "Nebula Signature"),
    (720, "Titanium Navigator"),
    (560, "Gold Pilot"),
    (420, "Silver Orbit"),
    (0, "Bronze Voyager"),
)

DEFAULT_QUESTS = (
    {
        "quest_id": "quest_launch_001",
        "title": "Launch the MTBank Galaxy",
        "description": "Finish your first secure sign-in and sync the profile with the galaxy hub.",
        "planet_code": PlanetCode.ORBIT_COMMERCE.value,
        "category": "activation",
        "condition_type": "auth_sessions_completed",
        "threshold": 1,
        "reward_kind": "bonus_points",
        "reward_value": 75,
        "stars_reward": 1,
        "display_order": 10,
    },
    {
        "quest_id": "quest_orbit_001",
        "title": "Cashback Comet Warmup",
        "description": "Complete 3 Halva Snake runs to unlock your first cashback mission bonus.",
        "planet_code": PlanetCode.ORBIT_COMMERCE.value,
        "category": "cashback",
        "condition_type": "game_runs_halva_snake",
        "threshold": 3,
        "reward_kind": "cashback",
        "reward_value": 7.5,
        "stars_reward": 1,
        "display_order": 20,
    },
    {
        "quest_id": "quest_orbit_002",
        "title": "Orbit Purchase Booster",
        "description": "Earn 120 stardust to activate a limited cashback booster window.",
        "planet_code": PlanetCode.ORBIT_COMMERCE.value,
        "category": "cashback",
        "condition_type": "stardust_earned",
        "threshold": 120,
        "reward_kind": "booster",
        "reward_value": 8,
        "stars_reward": 1,
        "display_order": 30,
    },
    {
        "quest_id": "quest_credit_001",
        "title": "Shield Discipline",
        "description": "Score 15 points inside Credit Shield Reactor to strengthen your reliability profile.",
        "planet_code": PlanetCode.CREDIT_SHIELD.value,
        "category": "reliability",
        "condition_type": "game_score_credit_shield",
        "threshold": 15,
        "reward_kind": "limit_boost",
        "reward_value": 80,
        "stars_reward": 1,
        "display_order": 40,
    },
    {
        "quest_id": "quest_credit_002",
        "title": "Trust Pulse",
        "description": "Finish 5 total mini-game runs to unlock a permanent rating increase.",
        "planet_code": PlanetCode.CREDIT_SHIELD.value,
        "category": "reliability",
        "condition_type": "total_game_runs",
        "threshold": 5,
        "reward_kind": "rating",
        "reward_value": 45,
        "stars_reward": 1,
        "display_order": 50,
    },
    {
        "quest_id": "quest_social_001",
        "title": "Invite the Crew",
        "description": "Send your first referral invite from the MTBank social orbit.",
        "planet_code": PlanetCode.SOCIAL_RING.value,
        "category": "social",
        "condition_type": "referral_invites",
        "threshold": 1,
        "reward_kind": "cashback",
        "reward_value": 10,
        "stars_reward": 1,
        "display_order": 60,
    },
    {
        "quest_id": "quest_social_002",
        "title": "Signal Network",
        "description": "Complete 3 Social Ring Signal runs to grow your MTBank loyalty points.",
        "planet_code": PlanetCode.SOCIAL_RING.value,
        "category": "social",
        "condition_type": "game_runs_social_ring",
        "threshold": 3,
        "reward_kind": "bonus_points",
        "reward_value": 140,
        "stars_reward": 1,
        "display_order": 70,
    },
    {
        "quest_id": "quest_social_003",
        "title": "Galaxy Ambassador",
        "description": "Invite 2 friends and unlock a premium vault crate for future bonuses.",
        "planet_code": PlanetCode.SOCIAL_RING.value,
        "category": "social",
        "condition_type": "referral_invites",
        "threshold": 2,
        "reward_kind": "vault_crate",
        "reward_value": 1,
        "stars_reward": 2,
        "display_order": 80,
    },
)


def level_from_xp(xp: int) -> int:
    if xp <= 0:
        return 1
    return max(1, floor(sqrt(xp / 18)) + 1)


def bank_rank_from_score(score: int) -> str:
    for threshold, label in BANK_RANKS:
        if score >= threshold:
            return label
    return BANK_RANKS[-1][1]


def get_game_base_reward(game_code: str, score: int) -> int:
    if game_code == GameCode.HALVA_SNAKE.value:
        return max(5, score * 3)
    if game_code == GameCode.CREDIT_SHIELD_REACTOR.value:
        return max(6, score * 2)
    return max(6, floor(score * 1.9))


def get_reward_display(reward_kind: str, reward_value: float) -> str:
    if reward_kind == "cashback":
        return f"{reward_value:.1f} BYN cashback"
    if reward_kind == "bonus_points":
        return f"{int(reward_value)} loyalty points"
    if reward_kind == "booster":
        return f"{int(reward_value)}% cashback booster for 24h"
    if reward_kind == "limit_boost":
        return f"+{int(reward_value)} BYN credit limit"
    if reward_kind == "rating":
        return f"+{int(reward_value)} rating"
    if reward_kind == "vault_crate":
        return f"{int(reward_value)} vault crate"
    if reward_kind == "stardust":
        return f"{int(reward_value)} stardust"
    return str(reward_value)


def describe_reward(reward_type: str, amount: float, meta: dict) -> tuple[str, str]:
    if reward_type == "game_stardust":
        return (
            "Stardust from game run",
            f"{meta.get('game_code', 'game')} generated {int(amount)} stardust for the banking galaxy.",
        )
    if reward_type == "game_cashback":
        return (
            "Instant cashback drop",
            f"Mini-game performance unlocked {amount:.1f} BYN cashback for your MTBank wallet.",
        )
    if reward_type == "game_bonus_points":
        return (
            "Loyalty points earned",
            f"You collected {int(amount)} bonus points from a game mission.",
        )
    if reward_type == "referral_cashback":
        return (
            "Referral cashback",
            f"Referral invite {meta.get('invitee_phone', '')} unlocked {amount:.1f} BYN cashback.",
        )
    if reward_type == "referral_bonus_points":
        return (
            "Referral loyalty points",
            f"The social orbit awarded {int(amount)} extra bonus points.",
        )
    if reward_type.startswith("quest_"):
        return (
            meta.get("quest_title", "Quest reward"),
            f"Quest reward delivered: {get_reward_display(meta.get('reward_kind', ''), amount)}.",
        )
    return ("Reward", f"Confirmed reward amount: {amount}")


def calculate_bonus(
    *,
    profile: UserProfile,
    planet_state: PlanetState,
    planet_code: str,
    game_code: str,
    base_reward: int,
    performance_score: int,
) -> BonusBreakdown:
    next_streak = min(profile.bonus_streak + 1, 7)
    streak_bonus = round(base_reward * min((next_streak - 1) * 0.06, 0.36))
    mastery_bonus = round(base_reward * min(planet_state.mastery * 0.04, 0.42))
    performance_bonus = min(14, performance_score // 3)
    focus_bonus = 2 if profile.selected_planet == planet_code else 0
    total_reward = base_reward + streak_bonus + mastery_bonus + performance_bonus + focus_bonus
    charge_gain = max(8, round(total_reward * 2.5))
    next_charge = profile.vault_charge + charge_gain
    crates_earned = next_charge // 100

    if game_code == GameCode.HALVA_SNAKE.value:
        cashback_gain = round(max(0.5, performance_score * 0.4), 1)
        bonus_points_gain = performance_score * 4
    elif game_code == GameCode.CREDIT_SHIELD_REACTOR.value:
        cashback_gain = 0.0
        bonus_points_gain = performance_score * 9
    else:
        cashback_gain = round(max(0.3, performance_score * 0.2), 1)
        bonus_points_gain = performance_score * 10

    return BonusBreakdown(
        base_reward=base_reward,
        streak_bonus=streak_bonus,
        mastery_bonus=mastery_bonus,
        performance_bonus=performance_bonus,
        focus_bonus=focus_bonus,
        total_reward=total_reward,
        cashback_gain=cashback_gain,
        bonus_points_gain=bonus_points_gain,
        charge_gain=charge_gain,
        crates_earned=crates_earned,
        next_vault_charge=next_charge % 100,
        next_streak=next_streak,
        next_mastery=min(planet_state.mastery + 1, 12),
    )


async def seed_quest_catalog(session: AsyncSession) -> None:
    existing = {quest.quest_id: quest for quest in (await session.scalars(select(Quest))).all()}
    for payload in DEFAULT_QUESTS:
        quest = existing.get(payload["quest_id"])
        if quest is None:
            session.add(Quest(**payload))
            continue
        for key, value in payload.items():
            setattr(quest, key, value)
    await session.flush()


async def ensure_quest_progress(session: AsyncSession, user_id: str) -> None:
    quest_ids = list((await session.scalars(select(Quest.quest_id))).all())
    existing = {
        quest_id
        for quest_id in (await session.scalars(select(QuestProgress.quest_id).where(QuestProgress.user_id == user_id))).all()
    }
    for quest_id in quest_ids:
        if quest_id not in existing:
            session.add(QuestProgress(user_id=user_id, quest_id=quest_id))
    await session.flush()


async def load_progress_snapshot(session: AsyncSession, user_id: str) -> dict:
    quest_rows = (
        await session.execute(
            select(Quest.planet_code, QuestProgress.status)
            .join(QuestProgress, Quest.quest_id == QuestProgress.quest_id)
            .where(QuestProgress.user_id == user_id)
        )
    ).all()
    claimed_by_planet: dict[str, int] = defaultdict(int)
    completed_total = 0
    for planet_code, status_value in quest_rows:
        if status_value == QuestStatus.CLAIMED.value:
            claimed_by_planet[planet_code] += 1
            completed_total += 1

    game_rows = (
        await session.execute(
            select(GameRun.planet_code, func.count(GameRun.run_id))
            .where(GameRun.user_id == user_id)
            .group_by(GameRun.planet_code)
        )
    ).all()
    game_runs_by_planet = {planet_code: int(runs) for planet_code, runs in game_rows}
    total_game_runs = sum(game_runs_by_planet.values())

    referral_count = int(
        (await session.scalar(select(func.count(Referral.referral_id)).where(Referral.inviter_user_id == user_id))) or 0
    )
    return {
        "claimed_by_planet": claimed_by_planet,
        "claimed_quests_total": completed_total,
        "game_runs_by_planet": game_runs_by_planet,
        "total_game_runs": total_game_runs,
        "referral_count": referral_count,
    }


def build_constellation_snapshots(
    *,
    profile: UserProfile,
    planets: list[PlanetState],
    snapshot: dict,
) -> list[dict]:
    planet_map = {planet.planet_code: planet for planet in planets}
    claimed_by_planet = snapshot["claimed_by_planet"]
    game_runs_by_planet = snapshot["game_runs_by_planet"]
    referral_count = snapshot["referral_count"]

    orbit = planet_map.get(PlanetCode.ORBIT_COMMERCE.value)
    credit = planet_map.get(PlanetCode.CREDIT_SHIELD.value)
    social = planet_map.get(PlanetCode.SOCIAL_RING.value)

    raw = [
        (
            ConstellationCode.CASHBACK_COMET.value,
            [
                (bool(orbit and orbit.xp >= 40), "Earn the first 40 cashback XP."),
                (bool(orbit and orbit.level >= 2), "Reach level 2 on the orbit commerce track."),
                (claimed_by_planet.get(PlanetCode.ORBIT_COMMERCE.value, 0) >= 1, "Claim the first cashback quest."),
                (profile.cashback_balance >= 10, "Accumulate 10 BYN cashback."),
                (game_runs_by_planet.get(PlanetCode.ORBIT_COMMERCE.value, 0) >= 4, "Play 4 orbit commerce runs."),
            ],
            "Cashback and card momentum around daily banking habits.",
        ),
        (
            ConstellationCode.TRUST_ANCHOR.value,
            [
                (bool(credit and credit.xp >= 40), "Earn the first 40 shield XP."),
                (bool(credit and credit.level >= 2), "Reach level 2 on the trust track."),
                (profile.on_time_payments_3m >= 2, "Build a streak of 2 reliable payment actions."),
                (claimed_by_planet.get(PlanetCode.CREDIT_SHIELD.value, 0) >= 1, "Claim a reliability quest."),
                (profile.current_limit >= 230, "Raise the available credit limit to 230 BYN."),
            ],
            "Reliability, limit growth and confidence inside the banking profile.",
        ),
        (
            ConstellationCode.COMMUNITY_NOVA.value,
            [
                (referral_count >= 1, "Send the first referral invite."),
                (referral_count >= 2, "Reach two active invites."),
                (claimed_by_planet.get(PlanetCode.SOCIAL_RING.value, 0) >= 1, "Claim a social quest."),
                (game_runs_by_planet.get(PlanetCode.SOCIAL_RING.value, 0) >= 3, "Play 3 social ring runs."),
                (profile.bonus_points >= 200, "Accumulate 200 loyalty points."),
            ],
            "Network growth, loyalty points and community-driven rewards.",
        ),
    ]

    result = []
    for constellation_code, star_rules, headline in raw:
        meta = CONSTELLATION_META[constellation_code]
        stars_filled = sum(1 for unlocked, _ in star_rules if unlocked)
        next_goal = next((label for unlocked, label in star_rules if not unlocked), "Constellation completed.")
        result.append(
            {
                "constellation_code": constellation_code,
                "title": meta["title"],
                "theme": meta["theme"],
                "headline": headline,
                "accent": meta["accent"],
                "planet_code": meta["planet_code"],
                "stars_filled": stars_filled,
                "total_stars": len(star_rules),
                "completion_ratio": round(stars_filled / len(star_rules), 2),
                "next_goal": next_goal,
            }
        )
    return result


def calculate_rating_score(*, profile: UserProfile, snapshot: dict) -> int:
    return max(
        250,
        280
        + profile.total_xp // 3
        + profile.bonus_points // 15
        + profile.rating_boost
        + profile.total_stars * 22
        + profile.completed_quests * 18
        + snapshot["referral_count"] * 25
        + profile.on_time_payments_3m * 10
        - profile.late_flags * 30,
    )


async def refresh_rollup(session: AsyncSession, user_id: str) -> list[dict]:
    profile = await session.get(UserProfile, user_id)
    planets = (await session.scalars(select(PlanetState).where(PlanetState.user_id == user_id))).all()
    profile.total_xp = sum(item.xp for item in planets)
    weighted = sum(item.level * PLANET_WEIGHTS.get(item.planet_code, 1.0) for item in planets)
    profile.orbit_level = max(1, floor(weighted))

    snapshot = await load_progress_snapshot(session, user_id)
    constellations = build_constellation_snapshots(profile=profile, planets=planets, snapshot=snapshot)
    profile.total_stars = sum(item["stars_filled"] for item in constellations)
    profile.completed_quests = snapshot["claimed_quests_total"]
    profile.rating_score = calculate_rating_score(profile=profile, snapshot=snapshot)
    profile.bank_rank = bank_rank_from_score(profile.rating_score)
    profile.risk_score = max(4, 48 - (profile.on_time_payments_3m * 4 + profile.total_stars * 2 + profile.completed_quests) + profile.late_flags * 8)
    profile.available_limit = min(profile.available_limit, profile.current_limit)
    return constellations


async def update_quest_progress(session: AsyncSession, user_id: str, condition_type: str, increment: float) -> None:
    quests = (await session.scalars(select(Quest).where(Quest.condition_type == condition_type, Quest.active.is_(True)))).all()
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
        progress.status = QuestStatus.COMPLETED.value if progress.current_value >= quest.threshold else QuestStatus.ACTIVE.value


async def get_planet_state(session: AsyncSession, user_id: str, planet_code: str) -> PlanetState:
    planet_state = await session.scalar(
        select(PlanetState).where(PlanetState.user_id == user_id, PlanetState.planet_code == planet_code)
    )
    if planet_state is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planet not found")
    return planet_state


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
        await refresh_rollup(session, existing.user_id)
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
        session.add(PlanetState(user_id=user.user_id, planet_code=planet_code.value))
    await seed_quest_catalog(session)
    await ensure_quest_progress(session, user.user_id)
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title="Profile launched",
            detail="MTBank Galaxy profile created and ready for constellation quests.",
            reward=0,
            planet_code=None,
        )
    )
    await refresh_rollup(session, user.user_id)
    await session.flush()
    return user


async def record_login_progress(session: AsyncSession, user: User) -> None:
    await update_quest_progress(session, user.user_id, "auth_sessions_completed", 1)
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title="Session synced",
            detail="User authenticated and refreshed the banking galaxy profile.",
            reward=0,
            planet_code=None,
        )
    )
    await refresh_rollup(session, user.user_id)


async def apply_game_run(session: AsyncSession, *, user: User, game_code: str, score: int) -> GameRun:
    if game_code not in GAME_PLANET_MAP:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown game code")
    if score < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score cannot be negative")

    profile = await session.get(UserProfile, user.user_id)
    planet_code = GAME_PLANET_MAP[game_code]
    planet_state = await get_planet_state(session, user.user_id, planet_code)
    base_reward = get_game_base_reward(game_code, score)
    bonus = calculate_bonus(
        profile=profile,
        planet_state=planet_state,
        planet_code=planet_code,
        game_code=game_code,
        base_reward=base_reward,
        performance_score=score,
    )

    profile.stardust += bonus.total_reward
    profile.bonus_streak = bonus.next_streak
    profile.vault_charge = bonus.next_vault_charge
    profile.vault_crates += bonus.crates_earned
    profile.total_energy += max(6, bonus.charge_gain)
    profile.cashback_balance = round(profile.cashback_balance + bonus.cashback_gain, 1)
    profile.bonus_points += bonus.bonus_points_gain

    if game_code == GameCode.CREDIT_SHIELD_REACTOR.value and score >= 4:
        profile.on_time_payments_3m = min(profile.on_time_payments_3m + 1, 12)

    xp_gain = max(base_reward, score * 4 + 10)
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
            reward_type="game_stardust",
            amount=bonus.total_reward,
            status="confirmed",
            meta={"game_code": game_code, "score": score, "planet_code": planet_code},
        )
    )
    if bonus.cashback_gain > 0:
        session.add(
            RewardLedger(
                user_id=user.user_id,
                reward_type="game_cashback",
                amount=bonus.cashback_gain,
                status="confirmed",
                meta={"game_code": game_code, "score": score, "planet_code": planet_code},
            )
        )
    if bonus.bonus_points_gain > 0:
        session.add(
            RewardLedger(
                user_id=user.user_id,
                reward_type="game_bonus_points",
                amount=bonus.bonus_points_gain,
                status="confirmed",
                meta={"game_code": game_code, "score": score, "planet_code": planet_code},
            )
        )
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title=f"Run completed: {game_code}",
            detail=(
                f"Score {score}, stardust {bonus.total_reward}, cashback {bonus.cashback_gain:.1f}, "
                f"points {bonus.bonus_points_gain}."
            ),
            reward=bonus.total_reward,
            planet_code=planet_code,
        )
    )

    if game_code == GameCode.HALVA_SNAKE.value:
        await update_quest_progress(session, user.user_id, "game_runs_halva_snake", 1)
    if game_code == GameCode.CREDIT_SHIELD_REACTOR.value:
        await update_quest_progress(session, user.user_id, "game_score_credit_shield", score)
    if game_code == GameCode.SOCIAL_RING_SIGNAL.value:
        await update_quest_progress(session, user.user_id, "game_runs_social_ring", 1)
    await update_quest_progress(session, user.user_id, "stardust_earned", bonus.total_reward)
    await update_quest_progress(session, user.user_id, "total_game_runs", 1)
    await refresh_rollup(session, user.user_id)
    await session.flush()
    return run


async def claim_quest_reward(session: AsyncSession, *, user: User, quest_id: str) -> RewardLedger:
    progress = await session.scalar(
        select(QuestProgress).where(QuestProgress.user_id == user.user_id, QuestProgress.quest_id == quest_id)
    )
    quest = await session.get(Quest, quest_id)
    if progress is None or quest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quest not found")
    if progress.status != QuestStatus.COMPLETED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quest is not ready to claim")

    profile = await session.get(UserProfile, user.user_id)
    reward_amount = quest.reward_value

    if quest.reward_kind == "booster":
        session.add(
            BoosterWindow(
                user_id=user.user_id,
                category="quest_cashback_booster",
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
    elif quest.reward_kind == "cashback":
        profile.cashback_balance = round(profile.cashback_balance + quest.reward_value, 1)
    elif quest.reward_kind == "bonus_points":
        profile.bonus_points += int(quest.reward_value)
    elif quest.reward_kind == "rating":
        profile.rating_boost += int(quest.reward_value)
    elif quest.reward_kind == "vault_crate":
        profile.vault_crates += int(quest.reward_value)

    progress.status = QuestStatus.CLAIMED.value
    progress.claimed_at = utcnow()
    ledger = RewardLedger(
        user_id=user.user_id,
        reward_type=f"quest_{quest.reward_kind}",
        amount=reward_amount,
        status="confirmed",
        meta={
            "quest_id": quest.quest_id,
            "quest_title": quest.title,
            "planet_code": quest.planet_code,
            "reward_kind": quest.reward_kind,
        },
    )
    session.add(ledger)
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title=f"Quest claimed: {quest.title}",
            detail=f"Quest reward applied: {get_reward_display(quest.reward_kind, quest.reward_value)}.",
            reward=int(reward_amount),
            planet_code=quest.planet_code,
        )
    )
    await refresh_rollup(session, user.user_id)
    await session.flush()
    return ledger


async def create_referral_reward(session: AsyncSession, *, user: User, invitee_phone: str) -> Referral:
    existing = await session.scalar(
        select(Referral).where(Referral.inviter_user_id == user.user_id, Referral.invitee_phone == invitee_phone)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Referral already exists")
    if invitee_phone == user.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot invite your own number")

    referral = Referral(
        inviter_user_id=user.user_id,
        invitee_phone=invitee_phone,
        invite_code=generate_id("invite").split("_", maxsplit=1)[1].upper(),
    )
    profile = await session.get(UserProfile, user.user_id)
    planet_state = await get_planet_state(session, user.user_id, PlanetCode.SOCIAL_RING.value)

    cashback_gain = 6.0
    bonus_points_gain = 90
    profile.cashback_balance = round(profile.cashback_balance + cashback_gain, 1)
    profile.bonus_points += bonus_points_gain
    profile.total_energy += 6
    planet_state.xp += 32
    planet_state.level = level_from_xp(planet_state.xp)

    session.add(referral)
    session.add(
        RewardLedger(
            user_id=user.user_id,
            reward_type="referral_cashback",
            amount=cashback_gain,
            status="confirmed",
            meta={"invitee_phone": invitee_phone},
        )
    )
    session.add(
        RewardLedger(
            user_id=user.user_id,
            reward_type="referral_bonus_points",
            amount=bonus_points_gain,
            status="confirmed",
            meta={"invitee_phone": invitee_phone},
        )
    )
    session.add(
        ActivityLog(
            user_id=user.user_id,
            title="Referral invite sent",
            detail=f"Invite sent to {invitee_phone}. Cashback and loyalty points added to the wallet.",
            reward=int(cashback_gain),
            planet_code=PlanetCode.SOCIAL_RING.value,
        )
    )
    await update_quest_progress(session, user.user_id, "referral_invites", 1)
    await update_quest_progress(session, user.user_id, "stardust_earned", 6)
    await refresh_rollup(session, user.user_id)
    await session.flush()
    return referral
