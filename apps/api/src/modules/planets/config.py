from __future__ import annotations

from dataclasses import dataclass

from common.enums import GameCode, PlanetCode

DAILY_GAME_ATTEMPT_LIMIT = 5
CASHBACK_INCREMENT = 0.5


@dataclass(frozen=True, slots=True)
class ConstellationConfig:
    name: str
    big_stars: int
    small_stars_per_segment: int


@dataclass(frozen=True, slots=True)
class GameConfig:
    code: str
    name: str


@dataclass(frozen=True, slots=True)
class PlanetConfig:
    id: str
    name: str
    cashback_start: float
    cashback_max: float
    game: GameConfig
    mcc_codes: tuple[str, ...]
    constellations: tuple[ConstellationConfig, ...]


DEFAULT_CONSTELLATIONS = (
    ConstellationConfig(name="Первый пояс", big_stars=3, small_stars_per_segment=4),
    ConstellationConfig(name="Звездный мост", big_stars=4, small_stars_per_segment=5),
    ConstellationConfig(name="Галактический купол", big_stars=5, small_stars_per_segment=6),
)

PLANET_CONFIGS: dict[str, PlanetConfig] = {
    PlanetCode.ORBIT_COMMERCE.value: PlanetConfig(
        id=PlanetCode.ORBIT_COMMERCE.value,
        name="Орбита покупок",
        cashback_start=1.0,
        cashback_max=5.0,
        game=GameConfig(code=GameCode.HALVA_SNAKE.value, name="Змейка Халва"),
        mcc_codes=("5411", "5499", "5812", "5814"),
        constellations=DEFAULT_CONSTELLATIONS,
    ),
    PlanetCode.CREDIT_SHIELD.value: PlanetConfig(
        id=PlanetCode.CREDIT_SHIELD.value,
        name="Кредитный щит",
        cashback_start=1.0,
        cashback_max=5.0,
        game=GameConfig(code=GameCode.CREDIT_SHIELD_REACTOR.value, name="Реактор щита"),
        mcc_codes=("6012", "6211", "6300"),
        constellations=DEFAULT_CONSTELLATIONS,
    ),
    PlanetCode.SOCIAL_RING.value: PlanetConfig(
        id=PlanetCode.SOCIAL_RING.value,
        name="Социальное кольцо",
        cashback_start=1.0,
        cashback_max=5.0,
        game=GameConfig(code=GameCode.SOCIAL_RING_SIGNAL.value, name="Сигнал кольца"),
        mcc_codes=("4814", "4899", "7399"),
        constellations=DEFAULT_CONSTELLATIONS,
    ),
}


def get_planet_config(planet_id: str) -> PlanetConfig | None:
    return PLANET_CONFIGS.get(planet_id)


def get_constellation(config: PlanetConfig, index: int) -> ConstellationConfig:
    safe_index = min(max(index, 0), len(config.constellations) - 1)
    return config.constellations[safe_index]


def progress_percent(*, current_big_star: int, small_stars_current: int, constellation: ConstellationConfig) -> float:
    total_small_stars = constellation.big_stars * constellation.small_stars_per_segment
    current = current_big_star * constellation.small_stars_per_segment + small_stars_current
    return round(min(current / total_small_stars * 100, 100), 2)
