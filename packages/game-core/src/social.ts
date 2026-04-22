export const SOCIAL_ROUNDS = 6;

export const SIGNAL_PADS = [
  { id: "nova", label: "Нова", accent: "#FF7A59" },
  { id: "glow", label: "Сияние", accent: "#3B82F6" },
  { id: "mint", label: "Мята", accent: "#14B8A6" },
  { id: "pulse", label: "Пульс", accent: "#F59E0B" },
] as const;

export type SignalPadId = (typeof SIGNAL_PADS)[number]["id"];

export function randomSignal(random = Math.random): SignalPadId {
  return SIGNAL_PADS[Math.floor(random() * SIGNAL_PADS.length)]!.id;
}

export function getSocialBaseReward(score: number): number {
  return Math.max(6, Math.floor(score * 1.8));
}
