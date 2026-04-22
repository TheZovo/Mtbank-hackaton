from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from db.base import Base


class DatabaseManager:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.engine: AsyncEngine | None = None
        self.session_factory: async_sessionmaker[AsyncSession] | None = None

    def setup(self) -> None:
        self.engine = create_async_engine(self.database_url, future=True, pool_pre_ping=True)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False, autoflush=False)

    async def create_schema(self) -> None:
        if self.engine is None:
            raise RuntimeError("Database engine is not initialized")
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def dispose(self) -> None:
        if self.engine is not None:
            await self.engine.dispose()


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.db.session_factory
    async with session_factory() as session:
        yield session


def get_settings_from_request(request: Request):
    return request.app.state.settings


def get_otp_store(request: Request):
    return request.app.state.otp_store


def get_job_dispatcher(request: Request):
    return request.app.state.job_dispatcher
