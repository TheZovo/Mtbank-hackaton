from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db_session
from modules.auth.service import get_current_user
from modules.promocodes.schemas import PromoCodeOut
from modules.promocodes.service import list_promocodes

router = APIRouter(prefix="/promocodes", tags=["promocodes"])


@router.get("", response_model=list[PromoCodeOut])
async def get_promocodes(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[PromoCodeOut]:
    return await list_promocodes(session, current_user)
