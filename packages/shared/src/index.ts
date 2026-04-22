export const PLANET_CODES = ["ORBIT_COMMERCE", "CREDIT_SHIELD", "SOCIAL_RING"] as const;
export type PlanetCode = (typeof PLANET_CODES)[number];

export const GAME_CODES = ["halva_snake", "credit_shield_reactor", "social_ring_signal"] as const;
export type GameCode = (typeof GAME_CODES)[number];

export const SEGMENT_OPTIONS = ["student", "first-jobber", "freelancer"] as const;
export type SegmentKey = (typeof SEGMENT_OPTIONS)[number];

export const PLANET_META: Record<
  PlanetCode,
  {
    title: string;
    summary: string;
    accent: string;
  }
> = {
  ORBIT_COMMERCE: {
    title: "Орбита покупок",
    summary: "Покупки, бонусы и ускорение прогресса через игровые награды.",
    accent: "#FF7A59",
  },
  CREDIT_SHIELD: {
    title: "Кредитный щит",
    summary: "Дисциплина, лимиты и укрепление пользовательского профиля.",
    accent: "#3B82F6",
  },
  SOCIAL_RING: {
    title: "Социальное кольцо",
    summary: "Рефералы, совместные активности и сетевой эффект.",
    accent: "#14B8A6",
  },
};

export const GAME_META: Record<
  GameCode,
  {
    title: string;
    planetCode: PlanetCode;
    description: string;
  }
> = {
  halva_snake: {
    title: "Змейка Халва",
    planetCode: "ORBIT_COMMERCE",
    description: "Аркадный ран для прокачки орбиты покупок.",
  },
  credit_shield_reactor: {
    title: "Реактор щита",
    planetCode: "CREDIT_SHIELD",
    description: "Тайминг-игра для укрепления кредитного щита.",
  },
  social_ring_signal: {
    title: "Сигнальный ринг",
    planetCode: "SOCIAL_RING",
    description: "Игра на память и ритм для социального контура.",
  },
};

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`.trim();
  }
  if (digits.length <= 10) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`.trim();
  }
  return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`.trim();
}
