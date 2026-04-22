from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import Settings, get_settings
from db.session import DatabaseManager
from infrastructure.cache.otp_store import build_otp_store
from infrastructure.jobs.dispatcher import JobDispatcher
from modules.auth.router import router as auth_router
from modules.devtools.seed import seed_defaults
from modules.games.router import router as games_router
from modules.leaderboard.router import router as leaderboard_router
from modules.profile.router import router as profile_router
from modules.quests.router import router as quests_router
from modules.referrals.router import router as referrals_router
from modules.rewards.router import router as rewards_router
from modules.users.router import router as users_router


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        db = DatabaseManager(app_settings.database_url)
        db.setup()
        app.state.settings = app_settings
        app.state.db = db
        app.state.otp_store = await build_otp_store(app_settings)
        app.state.job_dispatcher = JobDispatcher()
        if app_settings.auto_create_schema:
            await db.create_schema()
        if app_settings.seed_defaults:
            async with db.session_factory() as session:
                await seed_defaults(session)
        yield
        await app.state.otp_store.close()
        await db.dispose()

    app = FastAPI(title=app_settings.app_name, version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = app_settings.api_prefix
    app.include_router(auth_router, prefix=api)
    app.include_router(users_router, prefix=api)
    app.include_router(profile_router, prefix=api)
    app.include_router(quests_router, prefix=api)
    app.include_router(rewards_router, prefix=api)
    app.include_router(referrals_router, prefix=api)
    app.include_router(games_router, prefix=api)
    app.include_router(leaderboard_router, prefix=api)
    return app
