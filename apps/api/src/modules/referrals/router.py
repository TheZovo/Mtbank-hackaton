from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.referrals.schemas import ReferralCreateRequest, ReferralOut
from modules.referrals.service import create_referral, list_referrals

router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("", response_model=list[ReferralOut])
async def get_referrals(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[ReferralOut]:
    return await list_referrals(session, current_user)


@router.post("", response_model=ReferralOut)
async def create_referral_invite(
    payload: ReferralCreateRequest,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> ReferralOut:
    return await create_referral(session, current_user, payload.invitee_phone)
