from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import UserProfile
from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.profile.schemas import FocusPlanetRequest, GalaxyProfileResponse
from modules.profile.service import build_profile_response

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=GalaxyProfileResponse)
async def get_profile(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> GalaxyProfileResponse:
    return await build_profile_response(session, current_user)


@router.patch("/focus-planet", response_model=GalaxyProfileResponse)
async def set_focus_planet(
    payload: FocusPlanetRequest,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> GalaxyProfileResponse:
    profile = await session.get(UserProfile, current_user.user_id)
    profile.selected_planet = payload.planet_code.value
    await session.commit()
    return await build_profile_response(session, current_user)
