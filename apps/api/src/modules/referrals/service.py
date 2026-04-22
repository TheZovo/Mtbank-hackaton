from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import normalize_phone
from db.models import Referral, User
from modules.progression.service import create_referral_reward
from modules.referrals.schemas import ReferralOut


async def create_referral(session: AsyncSession, user: User, invitee_phone: str) -> ReferralOut:
    referral = await create_referral_reward(session, user=user, invitee_phone=normalize_phone(invitee_phone))
    await session.commit()
    await session.refresh(referral)
    return ReferralOut.model_validate(referral, from_attributes=True)


async def list_referrals(session: AsyncSession, user: User) -> list[ReferralOut]:
    rows = (
        await session.scalars(
            select(Referral).where(Referral.inviter_user_id == user.user_id).order_by(desc(Referral.created_at))
        )
    ).all()
    return [ReferralOut.model_validate(item, from_attributes=True) for item in rows]
