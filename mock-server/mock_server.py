from __future__ import annotations

import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from random import Random

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field

API_PREFIX = "/v1"
DAILY_ATTEMPTS_LIMIT = 5
BIG_STARS_TOTAL = 6
SMALL_STARS_PER_SEGMENT = 10

DEFAULT_ACCESS_TOKEN = "mock_access_token"
DEFAULT_REFRESH_TOKEN = "mock_refresh_token"
REFRESHED_ACCESS_TOKEN = "new_mock_access_token"
REFRESHED_REFRESH_TOKEN = "new_mock_refresh_token"

LOGGER = logging.getLogger("mtb-galaxy-mock-server")
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=os.getenv("MOCK_SERVER_LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )

CONSTELLATION_NAMES = (
    "Малая Медведица",
    "Кассиопея",
    "Орион",
    "Андромеда",
    "Пегас",
    "Лира",
)

LEADERBOARD_FIRST_NAMES = (
    "Арина",
    "Марк",
    "София",
    "Лев",
    "Полина",
    "Илья",
    "Ева",
    "Матвей",
    "Анна",
    "Артем",
    "Виктория",
    "Никита",
)

LEADERBOARD_LAST_NAMES = (
    "Иванова",
    "Смирнов",
    "Коваль",
    "Петрова",
    "Соколов",
    "Мельник",
    "Романова",
    "Орлов",
    "Морозова",
    "Кузьмин",
)


@dataclass(frozen=True)
class PlanetDefinition:
    planet_id: str
    name: str
    cashback_percent: float
    max_cashback_percent: float
    game_code: str
    game_name: str


PLANET_DEFINITIONS = (
    PlanetDefinition("apteki", "Аптеки", 2.5, 5.0, "halva_snake", "Змейка"),
    PlanetDefinition("azs", "АЗС", 3.0, 5.5, "turbo_fuel", "Турбо трасса"),
    PlanetDefinition("marketplace", "Маркетплейсы", 3.5, 6.0, "orbit_dash", "Орбитальный рывок"),
    PlanetDefinition("travel", "Путешествия", 2.0, 5.0, "travel_jump", "Космо-прыжок"),
    PlanetDefinition("kids", "Дети", 4.0, 6.5, "puzzle_kids", "Созвездие пазлов"),
    PlanetDefinition("home", "Дом", 3.0, 5.5, "home_builder", "Орбитальный дом"),
    PlanetDefinition("beauty", "Красота", 3.5, 6.0, "beauty_bloom", "Комета красоты"),
    PlanetDefinition("sport", "Спорт", 2.5, 5.5, "pulse_runner", "Пульс-раннер"),
    PlanetDefinition("tech", "Техника", 4.0, 6.5, "circuit_stack", "Цепь импульсов"),
    PlanetDefinition("leisure", "Досуг", 4.0, 6.0, "lounge_loop", "Лаунж-петля"),
)
PLANET_BY_ID = {planet.planet_id: planet for planet in PLANET_DEFINITIONS}


@dataclass
class PromoCodeRecord:
    code: str
    planet_id: str
    issued_at: datetime
    used_at: datetime | None = None


@dataclass
class ReferralRecordState:
    phone: str
    status: str = "joined"
    stars_earned: int = 1


@dataclass
class PlanetProgressState:
    planet_id: str
    cashback_percent: float
    max_cashback_percent: float
    constellation_index: int = 1
    period_small_stars: int = 0
    segment_small_stars: list[int] = field(default_factory=lambda: [0] * BIG_STARS_TOTAL)

    def active_segment_index(self) -> int:
        for index, value in enumerate(self.segment_small_stars):
            if value < SMALL_STARS_PER_SEGMENT:
                return index
        return BIG_STARS_TOTAL - 1

    def current_big_star(self) -> int:
        return self.active_segment_index() + 1

    def small_stars_current(self) -> int:
        return self.segment_small_stars[self.active_segment_index()]

    def big_stars(self) -> list[bool]:
        return [value >= SMALL_STARS_PER_SEGMENT for value in self.segment_small_stars]

    def constellation_name(self) -> str:
        return CONSTELLATION_NAMES[(self.constellation_index - 1) % len(CONSTELLATION_NAMES)]

    def progress_percent(self) -> int:
        total_small_stars = sum(self.segment_small_stars)
        ratio = total_small_stars / (BIG_STARS_TOTAL * SMALL_STARS_PER_SEGMENT)
        return max(0, min(round(ratio * 100), 100))

    def big_stars_until_increase(self) -> int:
        return max(BIG_STARS_TOTAL - self.current_big_star(), 0)

    def max_cashback_reached(self) -> bool:
        return self.cashback_percent >= self.max_cashback_percent

    def award_small_star(self) -> bool:
        segment_index = self.active_segment_index()
        self.segment_small_stars[segment_index] = min(
            self.segment_small_stars[segment_index] + 1,
            SMALL_STARS_PER_SEGMENT,
        )
        self.period_small_stars += 1
        return (
            segment_index == BIG_STARS_TOTAL - 1
            and self.segment_small_stars[segment_index] >= SMALL_STARS_PER_SEGMENT
        )

    def advance_constellation(self) -> None:
        self.constellation_index += 1
        self.segment_small_stars = [0] * BIG_STARS_TOTAL

    def increase_cashback(self) -> None:
        self.cashback_percent = round(
            min(self.cashback_percent + 0.5, self.max_cashback_percent),
            1,
        )

    def reset(self) -> None:
        self.cashback_percent = round(min(self.cashback_percent, self.max_cashback_percent), 1)
        self.constellation_index = 1
        self.period_small_stars = 0
        self.segment_small_stars = [0] * BIG_STARS_TOTAL


@dataclass
class UserState:
    user_id: str = "user-123"
    phone: str = "+7XXX"
    name: str = "Тестовый"
    focus_planet_id: str | None = None
    daily_attempts_used: int = 0
    total_constellations_sum: int = 0
    invite_code: str = "ABC123"
    promo_codes: list[PromoCodeRecord] = field(default_factory=list)
    referrals: list[ReferralRecordState] = field(default_factory=list)
    planets: dict[str, PlanetProgressState] = field(default_factory=dict)

    @classmethod
    def create_default(cls, phone: str = "+7XXX", name: str = "Тестовый") -> UserState:
        planets = {
            planet.planet_id: PlanetProgressState(
                planet_id=planet.planet_id,
                cashback_percent=planet.cashback_percent,
                max_cashback_percent=planet.max_cashback_percent,
            )
            for planet in PLANET_DEFINITIONS
        }
        return cls(phone=phone, name=name or "Тестовый", planets=planets)

    def average_cashback(self) -> float:
        return round(
            sum(planet.cashback_percent for planet in self.planets.values()) / len(self.planets),
            1,
        )

    def reset(self) -> None:
        self.focus_planet_id = None
        self.daily_attempts_used = 0
        self.total_constellations_sum = 0
        self.promo_codes = []
        self.referrals = []
        self.planets = {
            planet.planet_id: PlanetProgressState(
                planet_id=planet.planet_id,
                cashback_percent=planet.cashback_percent,
                max_cashback_percent=planet.max_cashback_percent,
            )
            for planet in PLANET_DEFINITIONS
        }


@dataclass
class MockState:
    users_by_token: dict[str, UserState] = field(default_factory=dict)
    refresh_to_user: dict[str, UserState] = field(default_factory=dict)
    global_promo_codes: list[PromoCodeRecord] = field(default_factory=list)

    def get_or_create_user(self, token: str) -> UserState:
        user = self.users_by_token.get(token)
        if user is None:
            user = UserState.create_default()
            self.users_by_token[token] = user
        return user

    def attach_access_token(self, token: str, user: UserState) -> None:
        self.users_by_token[token] = user

    def attach_refresh_token(self, refresh_token: str, user: UserState) -> None:
        self.refresh_to_user[refresh_token] = user

    def get_by_refresh_token(self, refresh_token: str) -> UserState | None:
        return self.refresh_to_user.get(refresh_token)

    def reset(self) -> None:
        self.users_by_token.clear()
        self.refresh_to_user.clear()
        self.global_promo_codes = []


class MockBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AuthUser(MockBaseModel):
    id: str
    phone: str
    name: str


class RequestOtpBody(MockBaseModel):
    phone: str = Field(..., examples=["+79991234567"])


class RequestOtpResponse(MockBaseModel):
    message: str
    dev_otp: str


class VerifyOtpBody(MockBaseModel):
    phone: str = Field(..., examples=["+79991234567"])
    code: str = Field(..., pattern=r"^\d{6}$", examples=["123456"])
    name: str | None = Field(default=None, examples=["Тестовый"])


class VerifyOtpResponse(MockBaseModel):
    access_token: str
    refresh_token: str
    user: AuthUser


class RefreshBody(MockBaseModel):
    refresh_token: str


class RefreshResponse(MockBaseModel):
    access_token: str
    refresh_token: str


class StatusResponse(MockBaseModel):
    status: str


class PlanetSummary(MockBaseModel):
    id: str
    name: str
    cashback_percent: float
    progress_percent: int


class PlanetsListResponse(MockBaseModel):
    planets: list[PlanetSummary]


class FocusBody(MockBaseModel):
    focus: bool = True


class ConstellationProgress(MockBaseModel):
    name: str
    index: int
    big_stars_total: int
    current_big_star: int
    small_stars_per_segment: int
    small_stars_current: int
    big_stars: list[bool]
    segment_small_stars: list[int]


class PlanetGameProgress(MockBaseModel):
    code: str
    name: str
    daily_attempts_used: int
    daily_attempts_limit: int


class PlanetProgressResponse(MockBaseModel):
    planet_id: str
    cashback_percent: float
    max_cashback_reached: bool
    constellation: ConstellationProgress
    period_small_stars: int
    big_stars_until_increase: int
    game: PlanetGameProgress


class GameRunBody(MockBaseModel):
    score: int = Field(..., ge=0)
    planet_id: str


class GameRunResponse(MockBaseModel):
    small_star_awarded: bool
    remaining_attempts_today: int
    planet_progress: PlanetProgressResponse


class LeaderboardEntry(MockBaseModel):
    rank: int
    user_id: str
    name: str
    avatar_url: str
    stars: int


class LeaderboardResponse(MockBaseModel):
    planet_id: str
    period: str
    my_rank: int
    my_stars: int
    leaders: list[LeaderboardEntry]


class MeResponse(MockBaseModel):
    id: str
    phone: str
    name: str
    daily_game_attempts_used: int
    daily_game_attempts_limit: int
    total_constellations_sum: int
    average_cashback: float


class PromoCodeModel(MockBaseModel):
    code: str
    planet_id: str
    issued_at: datetime
    used_at: datetime | None = None


class PromoCodesResponse(MockBaseModel):
    promocodes: list[PromoCodeModel]


class ReferralRecord(MockBaseModel):
    phone: str
    status: str
    stars_earned: int


class ReferralsResponse(MockBaseModel):
    invite_code: str
    referrals: list[ReferralRecord]


class ReferralCreateBody(MockBaseModel):
    phone: str


class ReferralCreateResponse(MockBaseModel):
    status: str
    invite_code: str


class AdminResetResponse(MockBaseModel):
    status: str


class AdminEndPeriodResponse(MockBaseModel):
    status: str
    promocodes_generated: int


class ErrorResponse(MockBaseModel):
    detail: str


bearer_scheme = HTTPBearer(auto_error=False)


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def generate_promocode(planet_id: str, prefix: str = "MTB") -> PromoCodeRecord:
    timestamp = utc_now()
    suffix = uuid.uuid4().hex[:4].upper()
    code = f"{prefix}_{planet_id.upper()}_{timestamp:%Y%m%d}_{suffix}"
    return PromoCodeRecord(code=code, planet_id=planet_id, issued_at=timestamp)


def get_state(request: Request) -> MockState:
    return request.app.state.mock_state


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    state: MockState = Depends(get_state),
) -> UserState:
    if credentials is None or credentials.credentials == "invalid-token":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return state.get_or_create_user(credentials.credentials)


def get_planet_definition_or_404(planet_id: str) -> PlanetDefinition:
    planet = PLANET_BY_ID.get(planet_id)
    if planet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planet not found")
    return planet


def serialize_promocode(record: PromoCodeRecord) -> PromoCodeModel:
    return PromoCodeModel(
        code=record.code,
        planet_id=record.planet_id,
        issued_at=record.issued_at,
        used_at=record.used_at,
    )


def build_planet_progress(
    user: UserState,
    planet: PlanetProgressState,
    definition: PlanetDefinition,
    game_code_override: str | None = None,
) -> PlanetProgressResponse:
    return PlanetProgressResponse(
        planet_id=planet.planet_id,
        cashback_percent=planet.cashback_percent,
        max_cashback_reached=planet.max_cashback_reached(),
        constellation=ConstellationProgress(
            name=planet.constellation_name(),
            index=planet.constellation_index,
            big_stars_total=BIG_STARS_TOTAL,
            current_big_star=planet.current_big_star(),
            small_stars_per_segment=SMALL_STARS_PER_SEGMENT,
            small_stars_current=planet.small_stars_current(),
            big_stars=planet.big_stars(),
            segment_small_stars=planet.segment_small_stars,
        ),
        period_small_stars=planet.period_small_stars,
        big_stars_until_increase=planet.big_stars_until_increase(),
        game=PlanetGameProgress(
            code=game_code_override or definition.game_code,
            name=definition.game_name,
            daily_attempts_used=user.daily_attempts_used,
            daily_attempts_limit=DAILY_ATTEMPTS_LIMIT,
        ),
    )


def build_planets_list(user: UserState) -> PlanetsListResponse:
    planets = []
    for definition in PLANET_DEFINITIONS:
        progress = user.planets[definition.planet_id]
        planets.append(
            PlanetSummary(
                id=definition.planet_id,
                name=definition.name,
                cashback_percent=progress.cashback_percent,
                progress_percent=progress.progress_percent(),
            )
        )
    return PlanetsListResponse(planets=planets)


def build_leaderboard(planet_id: str, period: str) -> LeaderboardResponse:
    randomizer = Random(f"{planet_id}:{period}")
    leaders: list[LeaderboardEntry] = []
    scores = sorted((randomizer.randint(10, 5000) for _ in range(50)), reverse=True)

    for rank, stars in enumerate(scores, start=1):
        first_name = randomizer.choice(LEADERBOARD_FIRST_NAMES)
        last_name = randomizer.choice(LEADERBOARD_LAST_NAMES)
        name = f"{first_name} {last_name}"
        leaders.append(
            LeaderboardEntry(
                rank=rank,
                user_id=f"user-{rank:03d}",
                name=name,
                avatar_url=f"https://api.dicebear.com/9.x/initials/svg?seed={rank}-{name}",
                stars=stars,
            )
        )

    return LeaderboardResponse(
        planet_id=planet_id,
        period=period,
        my_rank=randomizer.randint(1, 100),
        my_stars=randomizer.randint(10, 1000),
        leaders=leaders,
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title="MTB Galaxy Mock Server",
        version="1.0.0",
        description=(
            "Mock server for the MTB Galaxy mobile app. "
            "It provides OpenAPI contracts and mutable in-memory data for frontend and backend parallel work."
        ),
    )
    app.state.mock_state = MockState()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        started_at = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started_at) * 1000
            LOGGER.exception(
                "%s %s -> 500 %.2fms",
                request.method,
                request.url.path,
                duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - started_at) * 1000
        LOGGER.info(
            "%s %s -> %s %.2fms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    @app.get("/healthz", tags=["Utility"])
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.post(
        f"{API_PREFIX}/auth/request-otp",
        response_model=RequestOtpResponse,
        tags=["Auth"],
    )
    async def request_otp(payload: RequestOtpBody) -> RequestOtpResponse:
        return RequestOtpResponse(message="OTP sent", dev_otp="123456")

    @app.post(
        f"{API_PREFIX}/auth/verify-otp",
        response_model=VerifyOtpResponse,
        tags=["Auth"],
        responses={401: {"model": ErrorResponse}},
    )
    async def verify_otp(payload: VerifyOtpBody, state: MockState = Depends(get_state)) -> VerifyOtpResponse:
        user = state.get_or_create_user(DEFAULT_ACCESS_TOKEN)
        user.phone = payload.phone
        user.name = payload.name or user.name or "Тестовый"
        state.attach_access_token(DEFAULT_ACCESS_TOKEN, user)
        state.attach_refresh_token(DEFAULT_REFRESH_TOKEN, user)
        return VerifyOtpResponse(
            access_token=DEFAULT_ACCESS_TOKEN,
            refresh_token=DEFAULT_REFRESH_TOKEN,
            user=AuthUser(id=user.user_id, phone=user.phone, name=user.name),
        )

    @app.post(
        f"{API_PREFIX}/auth/refresh",
        response_model=RefreshResponse,
        tags=["Auth"],
    )
    async def refresh_token(payload: RefreshBody, state: MockState = Depends(get_state)) -> RefreshResponse:
        user = state.get_by_refresh_token(payload.refresh_token)
        if user is None:
            user = state.get_or_create_user(REFRESHED_ACCESS_TOKEN)
        state.attach_access_token(REFRESHED_ACCESS_TOKEN, user)
        state.attach_refresh_token(REFRESHED_REFRESH_TOKEN, user)
        return RefreshResponse(
            access_token=REFRESHED_ACCESS_TOKEN,
            refresh_token=REFRESHED_REFRESH_TOKEN,
        )

    @app.post(
        f"{API_PREFIX}/auth/logout",
        response_model=StatusResponse,
        tags=["Auth"],
        responses={401: {"model": ErrorResponse}},
    )
    async def logout(_: UserState = Depends(get_current_user)) -> StatusResponse:
        return StatusResponse(status="ok")

    @app.get(
        f"{API_PREFIX}/planets/list",
        response_model=PlanetsListResponse,
        tags=["Planets"],
        responses={401: {"model": ErrorResponse}},
    )
    async def list_planets(user: UserState = Depends(get_current_user)) -> PlanetsListResponse:
        return build_planets_list(user)

    @app.get(
        f"{API_PREFIX}/planets/{{planet_id}}/progress",
        response_model=PlanetProgressResponse,
        tags=["Planets"],
        responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    )
    async def get_planet_progress(
        planet_id: str,
        user: UserState = Depends(get_current_user),
    ) -> PlanetProgressResponse:
        definition = get_planet_definition_or_404(planet_id)
        return build_planet_progress(user, user.planets[planet_id], definition)

    @app.patch(
        f"{API_PREFIX}/planets/{{planet_id}}/focus",
        response_model=StatusResponse,
        tags=["Planets"],
        responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    )
    async def set_focus_planet(
        planet_id: str,
        payload: FocusBody,
        user: UserState = Depends(get_current_user),
    ) -> StatusResponse:
        get_planet_definition_or_404(planet_id)
        user.focus_planet_id = planet_id if payload.focus else None
        return StatusResponse(status="ok")

    @app.post(
        f"{API_PREFIX}/games/{{game_code}}/runs",
        response_model=GameRunResponse,
        tags=["Games"],
        responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    )
    async def submit_game_run(
        game_code: str,
        payload: GameRunBody,
        user: UserState = Depends(get_current_user),
    ) -> GameRunResponse:
        definition = get_planet_definition_or_404(payload.planet_id)
        planet = user.planets[payload.planet_id]

        if user.daily_attempts_used >= DAILY_ATTEMPTS_LIMIT:
            return GameRunResponse(
                small_star_awarded=False,
                remaining_attempts_today=0,
                planet_progress=build_planet_progress(user, planet, definition, game_code_override=game_code),
            )

        user.daily_attempts_used += 1
        constellation_completed = planet.award_small_star()

        if constellation_completed:
            user.total_constellations_sum += 1
            planet.increase_cashback()
            user.promo_codes.append(generate_promocode(payload.planet_id))
            planet.advance_constellation()

        return GameRunResponse(
            small_star_awarded=True,
            remaining_attempts_today=max(DAILY_ATTEMPTS_LIMIT - user.daily_attempts_used, 0),
            planet_progress=build_planet_progress(user, planet, definition, game_code_override=game_code),
        )

    @app.get(
        f"{API_PREFIX}/leaderboard/planet/{{planet_id}}",
        response_model=LeaderboardResponse,
        tags=["Leaderboard"],
        responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    )
    async def get_leaderboard(
        planet_id: str,
        period: str = Query(default="week", examples=["week"]),
        _: UserState = Depends(get_current_user),
    ) -> LeaderboardResponse:
        get_planet_definition_or_404(planet_id)
        return build_leaderboard(planet_id, period)

    @app.get(
        f"{API_PREFIX}/me",
        response_model=MeResponse,
        tags=["Profile"],
        responses={401: {"model": ErrorResponse}},
    )
    async def get_me(user: UserState = Depends(get_current_user)) -> MeResponse:
        return MeResponse(
            id=user.user_id,
            phone=user.phone,
            name=user.name,
            daily_game_attempts_used=user.daily_attempts_used,
            daily_game_attempts_limit=DAILY_ATTEMPTS_LIMIT,
            total_constellations_sum=user.total_constellations_sum,
            average_cashback=user.average_cashback(),
        )

    @app.get(
        f"{API_PREFIX}/promocodes",
        response_model=PromoCodesResponse,
        tags=["Promocodes"],
        responses={401: {"model": ErrorResponse}},
    )
    async def get_promocodes(
        user: UserState = Depends(get_current_user),
        state: MockState = Depends(get_state),
    ) -> PromoCodesResponse:
        merged = sorted(
            [*state.global_promo_codes, *user.promo_codes],
            key=lambda item: item.issued_at,
            reverse=True,
        )
        return PromoCodesResponse(promocodes=[serialize_promocode(item) for item in merged])

    @app.get(
        f"{API_PREFIX}/referrals",
        response_model=ReferralsResponse,
        tags=["Referrals"],
        responses={401: {"model": ErrorResponse}},
    )
    async def get_referrals(user: UserState = Depends(get_current_user)) -> ReferralsResponse:
        return ReferralsResponse(
            invite_code=user.invite_code,
            referrals=[
                ReferralRecord(
                    phone=referral.phone,
                    status=referral.status,
                    stars_earned=referral.stars_earned,
                )
                for referral in user.referrals
            ],
        )

    @app.post(
        f"{API_PREFIX}/referrals",
        response_model=ReferralCreateResponse,
        tags=["Referrals"],
        responses={401: {"model": ErrorResponse}},
    )
    async def create_referral(
        payload: ReferralCreateBody,
        user: UserState = Depends(get_current_user),
    ) -> ReferralCreateResponse:
        if payload.phone not in {referral.phone for referral in user.referrals}:
            user.referrals.append(ReferralRecordState(phone=payload.phone))
        return ReferralCreateResponse(status="ok", invite_code=user.invite_code)

    @app.post(
        f"{API_PREFIX}/admin/reset",
        response_model=AdminResetResponse,
        tags=["Admin"],
    )
    async def admin_reset(state: MockState = Depends(get_state)) -> AdminResetResponse:
        state.reset()
        return AdminResetResponse(status="reset")

    @app.post(
        f"{API_PREFIX}/admin/end_period",
        response_model=AdminEndPeriodResponse,
        tags=["Admin"],
    )
    async def admin_end_period(state: MockState = Depends(get_state)) -> AdminEndPeriodResponse:
        unique_users = {id(user): user for user in state.users_by_token.values()}.values()
        for user in unique_users:
            for planet in user.planets.values():
                planet.period_small_stars = 0

        generated_codes = [
            generate_promocode(
                PLANET_DEFINITIONS[index % len(PLANET_DEFINITIONS)].planet_id,
                prefix="TOP10",
            )
            for index in range(10)
        ]
        state.global_promo_codes.extend(generated_codes)

        return AdminEndPeriodResponse(status="period_ended", promocodes_generated=len(generated_codes))

    return app


app = create_app()


def main() -> None:
    uvicorn.run(
        "mock_server:app",
        host="0.0.0.0",
        port=int(os.getenv("MOCK_SERVER_PORT", "8001")),
        reload=False,
    )


if __name__ == "__main__":
    main()
