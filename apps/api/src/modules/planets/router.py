from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.planets.schemas import FocusPlanetRequest, FocusPlanetResponse, PlanetListItemOut, PlanetProgressOut
from modules.planets.service import build_planet_progress, list_planets, set_focus_planet

router = APIRouter(prefix="/planets", tags=["planets"])


@router.get("/list", response_model=list[PlanetListItemOut])
async def get_planets(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[PlanetListItemOut]:
    return await list_planets(session, current_user)


@router.get("/{planet_id}/progress", response_model=PlanetProgressOut)
async def get_planet_progress(
    planet_id: str,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> PlanetProgressOut:
    return await build_planet_progress(session, current_user, planet_id)


@router.patch("/{planet_id}/focus", response_model=FocusPlanetResponse)
async def focus_planet(
    planet_id: str,
    payload: FocusPlanetRequest,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> FocusPlanetResponse:
    return await set_focus_planet(session, current_user, planet_id, payload.focus)
