from __future__ import annotations

import secrets
import string

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import normalize_phone
from db.models import Referral, User, UserProfile
from modules.progression.service import add_small_star, apply_referral_invite_effects
from modules.referrals.schemas import ReferralCreateResponse, ReferralInviteOut, ReferralListResponse

INVITE_ALPHABET = string.ascii_uppercase + string.digits


def generate_invite_code() -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(6))


async def ensure_invite_code(session: AsyncSession, user_id: str) -> str:
    profile = await session.get(UserProfile, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    if profile.invite_code:
        return profile.invite_code

    while True:
        code = generate_invite_code()
        exists = await session.scalar(select(UserProfile.user_id).where(UserProfile.invite_code == code))
        if exists is None:
            profile.invite_code = code
            await session.flush()
            return code


async def list_referrals(session: AsyncSession, user: User) -> ReferralListResponse:
    invite_code = await ensure_invite_code(session, user.user_id)
    rows = (
        await session.scalars(
            select(Referral).where(Referral.inviter_user_id == user.user_id).order_by(desc(Referral.created_at))
        )
    ).all()
    await session.commit()
    return ReferralListResponse(
        invite_code=invite_code,
        referrals=[
            ReferralInviteOut(
                phone=item.invitee_phone,
                status=item.status,
                stars_earned=1,
            )
            for item in rows
        ],
    )


async def create_referral(session: AsyncSession, user: User, invitee_phone: str) -> ReferralCreateResponse:
    normalized_phone = normalize_phone(invitee_phone)
    if normalized_phone == user.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot invite your own number")

    existing_user = await session.scalar(select(User.user_id).where(User.phone == normalized_phone))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invitee is already registered")

    existing_referral = await session.scalar(
        select(Referral.referral_id).where(
            Referral.inviter_user_id == user.user_id,
            Referral.invitee_phone == normalized_phone,
        )
    )
    if existing_referral is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Referral already exists")

    invite_code = await ensure_invite_code(session, user.user_id)
    profile = await session.get(UserProfile, user.user_id)
    focus_planet_id = profile.focus_planet_id or profile.selected_planet

    session.add(
        Referral(
            inviter_user_id=user.user_id,
            invitee_phone=normalized_phone,
            status="invited",
        )
    )
    await add_small_star(
        session,
        user_id=user.user_id,
        planet_id=focus_planet_id,
        source="referral",
    )
    await apply_referral_invite_effects(session, user=user, invitee_phone=normalized_phone)
    await session.commit()
    return ReferralCreateResponse(status="ok", invite_code=invite_code)
