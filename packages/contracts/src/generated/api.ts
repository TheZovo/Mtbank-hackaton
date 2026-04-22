import type { GameCode, PlanetCode, SegmentKey } from "@mtb/shared";

export type PlanetId =
  | "apteki"
  | "azs"
  | "marketplace"
  | "travel"
  | "kids"
  | "home"
  | "beauty"
  | "sport"
  | "tech"
  | "leisure";

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
}

export interface AuthRequestOtpRequest {
  phone: string;
}

export interface AuthRequestOtpResponse {
  message: string;
  dev_otp: string;
}

export interface AuthVerifyOtpRequest {
  phone: string;
  code: string;
  name?: string | null;
}

export interface AuthRefreshRequest {
  refresh_token: string;
}

export interface AuthLogoutRequest {
  refresh_token: string;
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
}

export interface AuthLoginResponse extends AuthTokensResponse {
  user: AuthUser;
}

export interface MeResponse {
  id: string;
  phone: string;
  name: string;
  daily_game_attempts_used: number;
  daily_game_attempts_limit: number;
  total_constellations_sum: number;
  average_cashback: number;
}

export interface PromoCodeModel {
  code: string;
  planet_id: PlanetId | string;
  issued_at: string;
  used_at?: string | null;
}

export interface PromoCodesResponse {
  promocodes: PromoCodeModel[];
}

export interface ReferralRecord {
  phone: string;
  status: string;
  stars_earned: number;
}

export interface ReferralsResponse {
  invite_code: string;
  referrals: ReferralRecord[];
}

export interface ReferralCreateRequest {
  phone: string;
}

export interface ReferralCreateResponse {
  status: string;
  invite_code: string;
}

export interface PlanetSummary {
  id: PlanetId | string;
  name: string;
  cashback_percent: number;
  progress_percent: number;
}

export interface PlanetsListResponse {
  planets: PlanetSummary[];
}

export interface ConstellationProgress {
  name: string;
  index: number;
  big_stars_total: number;
  current_big_star: number;
  small_stars_per_segment: number;
  small_stars_current: number;
  big_stars: boolean[];
  segment_small_stars: number[];
}

export interface PlanetGameProgress {
  code: string;
  name: string;
  daily_attempts_used: number;
  daily_attempts_limit: number;
}

export interface PlanetProgressResponse {
  planet_id: PlanetId | string;
  cashback_percent: number;
  max_cashback_reached: boolean;
  constellation: ConstellationProgress;
  period_small_stars: number;
  big_stars_until_increase: number;
  game: PlanetGameProgress;
}

export interface FocusPlanetRequest {
  focus: boolean;
}

export interface LeaderboardEntry {
  rank?: number;
  user_id: string;
  display_name?: string;
  name?: string;
  avatar_url?: string;
  stars?: number;
  orbit_level?: number;
  total_xp?: number;
  bank_rank?: string;
  rating_score?: number;
  total_stars?: number;
  cashback_balance?: number;
}

export interface LeaderboardResponse {
  planet_id: PlanetId | string;
  period: string;
  my_rank: number;
  my_stars: number;
  leaders: LeaderboardEntry[];
}

export interface StatusResponse {
  status: string;
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
  condition_type?: string;
  threshold: number;
  reward_kind?: string;
  reward_value?: number;
  status: string;
  current_value: number;
  category?: string;
  stars_reward?: number;
  reward_display?: string;
}

export interface RewardEntry {
  ledger_id: string;
  reward_type?: string;
  amount?: number;
  status: string;
  created_at: string;
  meta?: Record<string, unknown>;
  title?: string;
  description?: string;
}

export interface ReferralEntry {
  referral_id: string;
  inviter_user_id?: string;
  invitee_phone: string;
  state: string;
  invite_code?: string;
  created_at?: string;
}

export interface ActivityEntry {
  activity_id: string;
  title: string;
  detail: string;
  reward: number;
  planet_code: PlanetCode | null;
  created_at: string;
}

export interface GameRunSubmitRequest {
  score: number;
  planet_id?: PlanetId | string;
}

export interface GameRunEntry {
  run_id?: string;
  game_code?: GameCode | string;
  planet_code?: PlanetCode | PlanetId | string;
  score: number;
  base_reward?: number;
  total_reward: number;
  bonus_breakdown?: Record<string, unknown>;
  created_at?: string;
  small_star_awarded?: boolean;
  remaining_attempts_today?: number;
  planet_progress?: PlanetProgressResponse;
}

export interface GameSummaryItem {
  game_code: GameCode;
  planet_code: PlanetCode;
  runs: number;
  best_score: number;
  total_reward: number;
  total_cashback?: number;
  total_bonus_points?: number;
}

export interface GameSummary {
  total_runs: number;
  total_reward: number;
  total_cashback?: number;
  total_bonus_points?: number;
  games: GameSummaryItem[];
}

export interface UserSummary {
  user_id: string;
  phone: string;
  display_name: string;
  segment: SegmentKey;
  created_at: string;
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

export interface UserByNicknameRequest {
  nickname: string;
  user_id?: string | null;
}

export interface UserByNicknameResponse {
  id: string;
  nickname: string;
}

export interface FriendAddRequest {
  user_id: string;
  friend_id: string;
}

export interface FriendEntryOut {
  id: string;
  nickname: string;
  games_played: number;
}

export type FriendsListResponse = FriendEntryOut[];

export interface PlayTogetherRequest {
  user_id: string;
  friend_id: string;
}

export interface PlayTogetherResponse {
  gift: boolean;
  promocode?: string | null;
}

export interface SimpleSuccessResponse {
  success: boolean;
}

export interface PaymentRequestCreateRequest {
  amount: number;
  description: string;
  user_id: string;
}

export interface PaymentRequestCreateResponse {
  id: string;
}

export interface PaymentRequestOut {
  id: string;
  amount: number;
  description: string;
  status: string;
}

export interface PaymentRequestPayResponse {
  success: boolean;
}
