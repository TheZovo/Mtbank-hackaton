export const PLANET_CODES = ["ORBIT_COMMERCE", "CREDIT_SHIELD", "SOCIAL_RING"] as const;
export type PlanetCode = (typeof PLANET_CODES)[number];

export const CONSTELLATION_CODES = ["CASHBACK_COMET", "TRUST_ANCHOR", "COMMUNITY_NOVA"] as const;
export type ConstellationCode = (typeof CONSTELLATION_CODES)[number];

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
    title: "Orbit Commerce",
    summary: "Card activity, daily cashback loops and spend-driven rewards.",
    accent: "#FF7A59",
  },
  CREDIT_SHIELD: {
    title: "Credit Shield",
    summary: "Reliability missions, healthier limits and trust score growth.",
    accent: "#3B82F6",
  },
  SOCIAL_RING: {
    title: "Social Ring",
    summary: "Referrals, community loops and shared loyalty momentum.",
    accent: "#14B8A6",
  },
};

export const CONSTELLATION_META: Record<
  ConstellationCode,
  {
    title: string;
    summary: string;
    accent: string;
  }
> = {
  CASHBACK_COMET: {
    title: "Cashback Comet",
    summary: "Fills up from card missions, orbit runs and cashback rewards.",
    accent: "#FF7A59",
  },
  TRUST_ANCHOR: {
    title: "Trust Anchor",
    summary: "Tracks reliability, shield discipline and rating stability.",
    accent: "#3B82F6",
  },
  COMMUNITY_NOVA: {
    title: "Community Nova",
    summary: "Expands through referrals, social play and loyalty points.",
    accent: "#14B8A6",
  },
};

export const BANK_RANK_META = [
  { minScore: 900, title: "Nebula Signature", accent: "#FBBF24" },
  { minScore: 720, title: "Titanium Navigator", accent: "#94A3B8" },
  { minScore: 560, title: "Gold Pilot", accent: "#F59E0B" },
  { minScore: 420, title: "Silver Orbit", accent: "#60A5FA" },
  { minScore: 0, title: "Bronze Voyager", accent: "#F97316" },
] as const;

export const GAME_META: Record<
  GameCode,
  {
    title: string;
    planetCode: PlanetCode;
    description: string;
  }
> = {
  halva_snake: {
    title: "Halva Snake",
    planetCode: "ORBIT_COMMERCE",
    description: "Arcade loop for cashback momentum and fast orbit progression.",
  },
  credit_shield_reactor: {
    title: "Credit Shield Reactor",
    planetCode: "CREDIT_SHIELD",
    description: "Timing game that improves trust missions and rating potential.",
  },
  social_ring_signal: {
    title: "Social Ring Signal",
    planetCode: "SOCIAL_RING",
    description: "Rhythm and memory game for loyalty points and community energy.",
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

export function buildStarString(filled: number, total: number): string {
  return `${"★".repeat(filled)}${"☆".repeat(Math.max(total - filled, 0))}`;
}
