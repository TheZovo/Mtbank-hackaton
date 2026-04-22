import type { GameCode, PlanetId } from "@mtb/contracts";

interface Point {
  x: number;
  y: number;
}

interface PlanetConstellationLayout {
  points: Point[];
  links: Array<[number, number]>;
}

export interface PlanetVisualMeta {
  id: PlanetId;
  title: string;
  category: string;
  orbitLabel: string;
  summary: string;
  focusHint: string;
  accent: string;
  fallbackCashback: number;
  gameCode: GameCode;
  gameTitle: string;
  leaderboardPrizeHint: string;
  constellation: PlanetConstellationLayout;
}

const BASE_LINKS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
];

export const PLANET_ORDER: PlanetId[] = ["apteki", "azs", "marketplace", "travel", "kids", "home", "beauty", "sport", "tech", "leisure"];

export const PERIOD_PRIZES = [
  { place: "1 место", reward: "Повышенный кешбэк +1% на следующую неделю" },
  { place: "2-3 место", reward: "Пакет промокодов и бонусные звезды периода" },
  { place: "4-10 место", reward: "Промокоды планеты и ускорение прогресса" },
];

export const PLANET_VISUALS: Record<PlanetId, PlanetVisualMeta> = {
  apteki: {
    id: "apteki",
    title: "Аптеки",
    category: "Здоровье",
    orbitLabel: "Аптечная орбита",
    summary: "Покупки здоровья и повседневные визиты в аптеки конвертируются в рост кешбэка и созвездия.",
    focusHint: "Собирайте большие звезды через игровые забеги и закрывайте еженедельный топ.",
    accent: "#50E3C2",
    fallbackCashback: 3.1,
    gameCode: "halva_snake",
    gameTitle: "Змейка Халва",
    leaderboardPrizeHint: "В этой орбите лидеры получают аптечные промокоды и буст прогресса.",
    constellation: {
      points: [
        { x: 22, y: 66 },
        { x: 39, y: 28 },
        { x: 59, y: 48 },
        { x: 76, y: 18 },
        { x: 82, y: 72 },
      ],
      links: BASE_LINKS,
    },
  },
  azs: {
    id: "azs",
    title: "АЗС",
    category: "Топливо",
    orbitLabel: "Топливный пояс",
    summary: "Топливные покупки и дорожные сценарии усиливают щит кешбэка и продвигают планету вверх.",
    focusHint: "Каждая большая звезда снижает дистанцию до следующего прироста +0.5%.",
    accent: "#F8D66D",
    fallbackCashback: 4.0,
    gameCode: "credit_shield_reactor",
    gameTitle: "Реактор щита",
    leaderboardPrizeHint: "Тут побеждают те, кто стабильно добирает звезды в течение всей недели.",
    constellation: {
      points: [
        { x: 16, y: 38 },
        { x: 33, y: 20 },
        { x: 51, y: 54 },
        { x: 68, y: 30 },
        { x: 86, y: 60 },
      ],
      links: BASE_LINKS,
    },
  },
  marketplace: {
    id: "marketplace",
    title: "Маркетплейсы",
    category: "Онлайн-покупки",
    orbitLabel: "Торговая дуга",
    summary: "Онлайн-заказы и регулярная активность формируют длинную серию звезд в торговом секторе.",
    focusHint: "Доберите оставшиеся большие звезды, чтобы ускорить рост кешбэка на этой планете.",
    accent: "#00B4D8",
    fallbackCashback: 4.8,
    gameCode: "social_ring_signal",
    gameTitle: "Сигнальный ринг",
    leaderboardPrizeHint: "В лидерах держатся игроки с самой длинной безошибочной серией.",
    constellation: {
      points: [
        { x: 18, y: 62 },
        { x: 34, y: 28 },
        { x: 52, y: 18 },
        { x: 71, y: 38 },
        { x: 84, y: 70 },
      ],
      links: BASE_LINKS,
    },
  },
  travel: {
    id: "travel",
    title: "Путешествия",
    category: "Путешествия",
    orbitLabel: "Маршрутный купол",
    summary: "Сектор поездок откроется позже и появится в карте сразу после публикации сервера для этой роли.",
    focusHint: "Пока планета закрыта, но место в сетке уже зарезервировано.",
    accent: "#7B8DFF",
    fallbackCashback: 2.5,
    gameCode: "halva_snake",
    gameTitle: "Змейка Халва",
    leaderboardPrizeHint: "Призы периода появятся вместе с запуском этой планеты.",
    constellation: {
      points: [
        { x: 14, y: 56 },
        { x: 30, y: 34 },
        { x: 48, y: 16 },
        { x: 68, y: 34 },
        { x: 86, y: 58 },
      ],
      links: BASE_LINKS,
    },
  },
  kids: {
    id: "kids",
    title: "Дети",
    category: "Семья",
    orbitLabel: "Семейная дуга",
    summary: "Роль FE2 резервирует место под детский сегмент без вмешательства в остальные модули.",
    focusHint: "После появления данных экран автоматически подхватит живой прогресс.",
    accent: "#FF7B94",
    fallbackCashback: 2.0,
    gameCode: "social_ring_signal",
    gameTitle: "Сигнальный ринг",
    leaderboardPrizeHint: "Пока доступен только зарезервированный слот для будущего запуска.",
    constellation: {
      points: [
        { x: 18, y: 24 },
        { x: 36, y: 62 },
        { x: 54, y: 24 },
        { x: 72, y: 62 },
        { x: 88, y: 30 },
      ],
      links: BASE_LINKS,
    },
  },
  home: {
    id: "home",
    title: "Дом",
    category: "Быт",
    orbitLabel: "Домашний контур",
    summary: "Бытовая планета пока не пришла с сервера, но интерфейс готов к её активации без новой верстки.",
    focusHint: "Когда планета станет доступна, карточка раскроется в полноценный detail-flow.",
    accent: "#F97316",
    fallbackCashback: 2.8,
    gameCode: "credit_shield_reactor",
    gameTitle: "Реактор щита",
    leaderboardPrizeHint: "Недельные награды будут подхвачены тем же модальным окном.",
    constellation: {
      points: [
        { x: 20, y: 66 },
        { x: 38, y: 42 },
        { x: 52, y: 16 },
        { x: 66, y: 42 },
        { x: 82, y: 66 },
      ],
      links: BASE_LINKS,
    },
  },
  beauty: {
    id: "beauty",
    title: "Красота",
    category: "Уход",
    orbitLabel: "Сияющий пояс",
    summary: "Слот под категорию красоты подготовлен и совместим с теми же экранами прогресса и лидерборда.",
    focusHint: "Когда API начнет отдавать данные, карточка откроется без дополнительных изменений.",
    accent: "#F06292",
    fallbackCashback: 2.7,
    gameCode: "halva_snake",
    gameTitle: "Змейка Халва",
    leaderboardPrizeHint: "Призы периода будут отображаться в общем модальном блоке.",
    constellation: {
      points: [
        { x: 14, y: 28 },
        { x: 32, y: 56 },
        { x: 50, y: 24 },
        { x: 68, y: 56 },
        { x: 86, y: 34 },
      ],
      links: BASE_LINKS,
    },
  },
  sport: {
    id: "sport",
    title: "Спорт",
    category: "Активность",
    orbitLabel: "Импульсная линия",
    summary: "Спортивная планета уже вписана в общую карту и готова к запуску в том же UX-потоке.",
    focusHint: "Пока слот закрыт, но визуально ведёт себя так же, как будущие доступные планеты.",
    accent: "#34D399",
    fallbackCashback: 3.0,
    gameCode: "credit_shield_reactor",
    gameTitle: "Реактор щита",
    leaderboardPrizeHint: "Когда сервер откроет эту планету, лидерборд автоматически подхватит фильтр.",
    constellation: {
      points: [
        { x: 14, y: 52 },
        { x: 30, y: 26 },
        { x: 50, y: 64 },
        { x: 70, y: 24 },
        { x: 88, y: 48 },
      ],
      links: BASE_LINKS,
    },
  },
  tech: {
    id: "tech",
    title: "Техника",
    category: "Электроника",
    orbitLabel: "Технокольцо",
    summary: "Технопланета добавлена как полноценный слот карты, чтобы сетка FE2 оставалась завершенной.",
    focusHint: "После запуска серверных эндпоинтов этот слот станет активным без переработки навигации.",
    accent: "#60A5FA",
    fallbackCashback: 3.3,
    gameCode: "social_ring_signal",
    gameTitle: "Сигнальный ринг",
    leaderboardPrizeHint: "Награды и таблица лидеров для этой планеты используют ту же структуру данных.",
    constellation: {
      points: [
        { x: 16, y: 38 },
        { x: 34, y: 18 },
        { x: 54, y: 34 },
        { x: 72, y: 20 },
        { x: 88, y: 62 },
      ],
      links: BASE_LINKS,
    },
  },
  leisure: {
    id: "leisure",
    title: "Досуг",
    category: "Развлечения",
    orbitLabel: "Созвездие досуга",
    summary: "Последний слот карты нужен, чтобы FE2 отдавал полную сетку из 10 планет уже сейчас.",
    focusHint: "Пока данные не пришли, карточка отображается как закрытая орбита.",
    accent: "#A78BFA",
    fallbackCashback: 2.4,
    gameCode: "halva_snake",
    gameTitle: "Змейка Халва",
    leaderboardPrizeHint: "При запуске планета автоматически подключится к тем же prize и leaderboard flow.",
    constellation: {
      points: [
        { x: 18, y: 24 },
        { x: 36, y: 44 },
        { x: 54, y: 18 },
        { x: 72, y: 48 },
        { x: 84, y: 72 },
      ],
      links: BASE_LINKS,
    },
  },
};

export function getPlanetMeta(planetId: string) {
  return PLANET_VISUALS[(PLANET_VISUALS[planetId as PlanetId] ? planetId : "apteki") as PlanetId];
}

export function getPlanetShareMessage(planetId: string, cashbackPercent: number, periodStars: number) {
  const meta = getPlanetMeta(planetId);
  return `${meta.title}: кешбэк ${cashbackPercent.toFixed(1)}%, звезд периода ${periodStars}.`;
}
