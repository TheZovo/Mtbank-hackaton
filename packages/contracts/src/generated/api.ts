import type { GameCode, PlanetCode, SegmentKey } from "@mtb/shared";

export interface AuthRequestOtpRequest {
  phone: string;
}

export interface AuthRequestOtpResponse {
  challenge_id: string;
  expires_in_seconds: number;
  dev_code?: string | null;
}

export interface AuthVerifyOtpRequest {
  challenge_id: string;
  phone: string;
  otp_code: string;
  display_name?: string | null;
  segment?: SegmentKey | null;
}

export interface AuthRefreshRequest {
  refresh_token: string;
}

export interface AuthLogoutRequest {
  refresh_token: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in_seconds: number;
}

export interface AuthLoginResponse extends AuthTokens {
  user: UserSummary;
  me: MeResponse;
}

export interface UserSummary {
  user_id: string;
  phone: string;
  display_name: string;
  segment: SegmentKey;
  created_at: string;
}

export interface MeResponse {
  user: UserSummary;
  selected_planet: PlanetCode;
}

export interface PlanetProgress {
  planet_code: PlanetCode;
  xp: number;
  level: number;
  mastery: number;
}

export interface BoosterWindow {
  booster_id: string;
  category: string;
  boost_rate: number;
  start_at: string;
  end_at: string;
  status: string;
}

export interface QuestItem {
  quest_id: string;
  title: string;
  description: string;
  planet_code: PlanetCode;
  condition_type: string;
  threshold: number;
  reward_kind: string;
  reward_value: number;
  status: string;
  current_value: number;
}

export interface RewardEntry {
  ledger_id: string;
  reward_type: string;
  amount: number;
  status: string;
  created_at: string;
  meta: Record<string, unknown>;
}

export interface ReferralEntry {
  referral_id: string;
  inviter_user_id: string;
  invitee_phone: string;
  state: string;
  invite_code: string;
  created_at: string;
}

export interface ActivityEntry {
  activity_id: string;
  title: string;
  detail: string;
  reward: number;
  planet_code: PlanetCode | null;
  created_at: string;
}

export interface GameRunEntry {
  run_id: string;
  game_code: GameCode;
  planet_code: PlanetCode;
  score: number;
  base_reward: number;
  total_reward: number;
  bonus_breakdown: Record<string, unknown>;
  created_at: string;
}

export interface GameSummaryItem {
  game_code: GameCode;
  planet_code: PlanetCode;
  runs: number;
  best_score: number;
  total_reward: number;
}

export interface GameSummary {
  total_runs: number;
  total_reward: number;
  games: GameSummaryItem[];
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  orbit_level: number;
  total_xp: number;
}

export interface GalaxyProfile {
  user: UserSummary;
  orbit_level: number;
  total_energy: number;
  total_xp: number;
  stardust: number;
  bonus_streak: number;
  vault_charge: number;
  vault_crates: number;
  selected_planet: PlanetCode;
  planets: PlanetProgress[];
  active_boosters: BoosterWindow[];
  quests: QuestItem[];
  reward_ledger_preview: RewardEntry[];
  activity: ActivityEntry[];
  installment_profile: {
    current_limit: number;
    available_limit: number;
    risk_score: number;
    on_time_payments_3m: number;
    late_flags: number;
  };
}

export interface FocusPlanetRequest {
  planet_code: PlanetCode;
}

export interface ReferralCreateRequest {
  invitee_phone: string;
}

export interface GameRunSubmitRequest {
  score: number;
}
