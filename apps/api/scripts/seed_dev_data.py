from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from core.config import get_settings
from modules.devtools.seed import seed_defaults
from modules.progression.service import provision_user


async def main() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, future=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        await seed_defaults(session)
        await provision_user(
            session,
            phone="+10000000001",
            display_name="Мобильный пилот",
            segment=None,
        )
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
