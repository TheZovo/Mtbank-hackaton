export const SHIELD_ROUNDS = 12;
export const SHIELD_PULSE_START = 12;
export const SHIELD_PULSE_BASE_SPEED = 28;
export const SHIELD_PULSE_ROUND_SPEED = 2.8;

export type AccuracyBand = "perfect" | "good" | "miss";

export function getShieldAccuracyBand(position: number): AccuracyBand {
  if (position >= 44 && position <= 56) return "perfect";
  if (position >= 34 && position <= 66) return "good";
  return "miss";
}

export function getShieldScoreIncrement(band: AccuracyBand): number {
  if (band === "perfect") return 3;
  if (band === "good") return 1;
  return 0;
}

export function getShieldBaseReward(score: number): number {
  return Math.max(5, score * 2);
}
