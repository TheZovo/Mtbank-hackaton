import type {
  AuthLoginResponse,
  AuthRefreshRequest,
  AuthRequestOtpRequest,
  AuthRequestOtpResponse,
  AuthTokensResponse,
  FocusPlanetRequest,
  GameRunEntry,
  GameRunSubmitRequest,
  GameSummary,
  GalaxyProfile,
  LeaderboardEntry,
  LeaderboardResponse,
  MeResponse,
  PlanetId,
  PlanetProgressResponse,
  PlanetsListResponse,
  PromoCodesResponse,
  QuestItem,
  ReferralCreateRequest,
  ReferralCreateResponse,
  ReferralsResponse,
  RewardEntry,
} from "@mtb/contracts";
import type { GameCode } from "@mtb/contracts";
import { API_BASE_URL } from "../config/env";
import { useSessionStore } from "../state/session-store";

const DEFAULT_GAME_PLANETS: Record<string, PlanetId> = {
  halva_snake: "apteki",
  credit_shield_reactor: "azs",
  social_ring_signal: "marketplace",
};
const DEMO_SESSION_USER_ID = "web-demo-user";

interface DemoSessionState {
  me: MeResponse;
  planetProgress: Record<string, PlanetProgressResponse>;
  planets: PlanetsListResponse;
  promocodes: PromoCodesResponse;
  referrals: ReferralsResponse;
  leaderboards: Record<string, LeaderboardResponse>;
}

const FALLBACK_SUMMARY_GAMES: GameSummary["games"] = [
  {
    game_code: "halva_snake",
    planet_code: "ORBIT_COMMERCE",
    runs: 0,
    best_score: 0,
    total_reward: 0,
    total_cashback: 0,
    total_bonus_points: 0,
  },
  {
    game_code: "credit_shield_reactor",
    planet_code: "CREDIT_SHIELD",
    runs: 0,
    best_score: 0,
    total_reward: 0,
    total_cashback: 0,
    total_bonus_points: 0,
  },
  {
    game_code: "social_ring_signal",
    planet_code: "SOCIAL_RING",
    runs: 0,
    best_score: 0,
    total_reward: 0,
    total_cashback: 0,
    total_bonus_points: 0,
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildDemoSessionState(): DemoSessionState {
  const me: MeResponse = {
    id: DEMO_SESSION_USER_ID,
    phone: "+375000000000",
    name: "Demo User",
    daily_game_attempts_used: 1,
    daily_game_attempts_limit: 5,
    total_constellations_sum: 12,
    average_cashback: 4.8,
  };

  const planets: PlanetsListResponse = {
    planets: [
      { id: "apteki", name: "Аптеки", cashback_percent: 3.2, progress_percent: 68 },
      { id: "azs", name: "АЗС", cashback_percent: 4.4, progress_percent: 52 },
      { id: "marketplace", name: "Маркетплейсы", cashback_percent: 5.1, progress_percent: 83 },
    ],
  };

  const planetProgress: Record<string, PlanetProgressResponse> = {
    apteki: {
      planet_id: "apteki",
      cashback_percent: 3.2,
      max_cashback_reached: false,
      constellation: {
        name: "Аптечная орбита",
        index: 1,
        big_stars_total: 5,
        current_big_star: 3,
        small_stars_per_segment: 5,
        small_stars_current: 3,
        big_stars: [true, true, true, false, false],
        segment_small_stars: [5, 4, 3, 0, 0],
      },
      period_small_stars: 12,
      big_stars_until_increase: 2,
      game: {
        code: "halva_snake",
        name: "Змейка Халва",
        daily_attempts_used: 1,
        daily_attempts_limit: 5,
      },
    },
    azs: {
      planet_id: "azs",
      cashback_percent: 4.4,
      max_cashback_reached: false,
      constellation: {
        name: "Топливный пояс",
        index: 2,
        big_stars_total: 5,
        current_big_star: 2,
        small_stars_per_segment: 5,
        small_stars_current: 1,
        big_stars: [true, true, false, false, false],
        segment_small_stars: [5, 3, 1, 0, 0],
      },
      period_small_stars: 9,
      big_stars_until_increase: 4,
      game: {
        code: "credit_shield_reactor",
        name: "Реактор щита",
        daily_attempts_used: 0,
        daily_attempts_limit: 5,
      },
    },
    marketplace: {
      planet_id: "marketplace",
      cashback_percent: 5.1,
      max_cashback_reached: false,
      constellation: {
        name: "Торговая дуга",
        index: 3,
        big_stars_total: 5,
        current_big_star: 4,
        small_stars_per_segment: 5,
        small_stars_current: 4,
        big_stars: [true, true, true, true, false],
        segment_small_stars: [5, 5, 4, 4, 0],
      },
      period_small_stars: 18,
      big_stars_until_increase: 1,
      game: {
        code: "social_ring_signal",
        name: "Сигнальный ринг",
        daily_attempts_used: 0,
        daily_attempts_limit: 5,
      },
    },
  };

  const leaderboards: Record<string, LeaderboardResponse> = {
    apteki: {
      planet_id: "apteki",
      period: "week",
      my_rank: 4,
      my_stars: 12,
      leaders: [
        { rank: 1, user_id: "l-1", name: "Алина", stars: 20, avatar_url: "https://i.pravatar.cc/96?img=12" },
        { rank: 2, user_id: "l-2", name: "Максим", stars: 18, avatar_url: "https://i.pravatar.cc/96?img=14" },
        { rank: 3, user_id: "l-3", name: "Даша", stars: 15, avatar_url: "https://i.pravatar.cc/96?img=18" },
        { rank: 4, user_id: DEMO_SESSION_USER_ID, name: "Demo User", stars: 12, avatar_url: "https://i.pravatar.cc/96?img=22" },
      ],
    },
    azs: {
      planet_id: "azs",
      period: "week",
      my_rank: 5,
      my_stars: 9,
      leaders: [
        { rank: 1, user_id: "l-4", name: "Илья", stars: 17, avatar_url: "https://i.pravatar.cc/96?img=28" },
        { rank: 2, user_id: "l-5", name: "Ника", stars: 16, avatar_url: "https://i.pravatar.cc/96?img=32" },
        { rank: 3, user_id: "l-6", name: "Соня", stars: 13, avatar_url: "https://i.pravatar.cc/96?img=36" },
        { rank: 5, user_id: DEMO_SESSION_USER_ID, name: "Demo User", stars: 9, avatar_url: "https://i.pravatar.cc/96?img=22" },
      ],
    },
    marketplace: {
      planet_id: "marketplace",
      period: "week",
      my_rank: 3,
      my_stars: 18,
      leaders: [
        { rank: 1, user_id: "l-7", name: "Кирилл", stars: 25, avatar_url: "https://i.pravatar.cc/96?img=48" },
        { rank: 2, user_id: "l-8", name: "Ева", stars: 21, avatar_url: "https://i.pravatar.cc/96?img=52" },
        { rank: 3, user_id: DEMO_SESSION_USER_ID, name: "Demo User", stars: 18, avatar_url: "https://i.pravatar.cc/96?img=22" },
      ],
    },
  };

  const promocodes: PromoCodesResponse = {
    promocodes: [
      { code: "HALVA-STAR-10", planet_id: "apteki", issued_at: "2026-04-18T10:00:00Z", used_at: null },
      { code: "AZS-BOOST-5", planet_id: "azs", issued_at: "2026-04-17T14:30:00Z", used_at: null },
    ],
  };

  const referrals: ReferralsResponse = {
    invite_code: "DEMO-ORBIT-42",
    referrals: [
      { phone: "+375291112233", status: "joined", stars_earned: 3 },
      { phone: "+375292224466", status: "pending", stars_earned: 0 },
    ],
  };

  return { me, planetProgress, planets, promocodes, referrals, leaderboards };
}

let demoSessionState = buildDemoSessionState();

function isDemoSession() {
  return useSessionStore.getState().me?.id === DEMO_SESSION_USER_ID;
}

function getDemoPlanetId(planetId?: string) {
  if (planetId && demoSessionState.planetProgress[planetId]) {
    return planetId;
  }
  return "apteki";
}

function getDemoLeaderboard(planetId?: string) {
  const resolvedPlanetId = getDemoPlanetId(planetId);
  return demoSessionState.leaderboards[resolvedPlanetId];
}

async function parseError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return new Error(payload.detail ?? `API error ${response.status}`);
  } catch {
    return new Error(`API error ${response.status}`);
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function getMeWithAccessToken(accessToken: string): Promise<MeResponse> {
  return fetchJson<MeResponse>("/me", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function request<T>(path: string, init?: RequestInit, retryOnAuth = true): Promise<T> {
  const state = useSessionStore.getState();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 401 && retryOnAuth && state.refreshToken) {
    const refreshed = await refreshTokens({ refresh_token: state.refreshToken });
    const me = await getMeWithAccessToken(refreshed.access_token);
    await useSessionStore.getState().setSession({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      me,
    });
    return request<T>(path, init, false);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function resolvePlanetId(gameCode: GameCode, planetId?: string): PlanetId | string {
  return planetId ?? DEFAULT_GAME_PLANETS[gameCode] ?? "apteki";
}

export async function requestOtp(payload: AuthRequestOtpRequest): Promise<AuthRequestOtpResponse> {
  return request<AuthRequestOtpResponse>(
    "/auth/request-otp",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    false,
  );
}

export async function verifyOtp(payload: { phone: string; code: string; name?: string }): Promise<AuthLoginResponse> {
  return request<AuthLoginResponse>(
    "/auth/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    false,
  );
}

export async function refreshTokens(payload: AuthRefreshRequest): Promise<AuthTokensResponse> {
  return request<AuthTokensResponse>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    false,
  );
}

export async function logout(): Promise<void> {
  const refreshToken = useSessionStore.getState().refreshToken;
  if (!refreshToken) {
    return;
  }
  await request<void>(
    "/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    false,
  );
}

export async function getMe(): Promise<MeResponse> {
  if (isDemoSession()) {
    return clone(demoSessionState.me);
  }
  return request<MeResponse>("/me");
}

export async function getPromocodes(): Promise<PromoCodesResponse> {
  if (isDemoSession()) {
    return clone(demoSessionState.promocodes);
  }
  return request<PromoCodesResponse>("/promocodes");
}

export async function getReferrals(): Promise<ReferralsResponse> {
  if (isDemoSession()) {
    return clone(demoSessionState.referrals);
  }
  return request<ReferralsResponse>("/referrals");
}

export async function createReferral(payload: ReferralCreateRequest): Promise<ReferralCreateResponse> {
  if (isDemoSession()) {
    demoSessionState.referrals.referrals.unshift({
      phone: payload.phone,
      status: "pending",
      stars_earned: 0,
    });
    return {
      status: "created",
      invite_code: demoSessionState.referrals.invite_code,
    };
  }
  return request<ReferralCreateResponse>("/referrals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPlanetsList(): Promise<PlanetsListResponse> {
  if (isDemoSession()) {
    return clone(demoSessionState.planets);
  }
  return request<PlanetsListResponse>("/planets/list");
}

export async function getPlanetProgress(planetId: string): Promise<PlanetProgressResponse> {
  if (isDemoSession()) {
    return clone(demoSessionState.planetProgress[getDemoPlanetId(planetId)]);
  }
  return request<PlanetProgressResponse>(`/planets/${planetId}/progress`);
}

export async function setFocusPlanet(planetId: string, focus = true) {
  if (isDemoSession()) {
    return { status: focus ? "focused" : "idle" };
  }
  return request<{ status: string }>(`/planets/${planetId}/focus`, {
    method: "PATCH",
    body: JSON.stringify({ focus } satisfies FocusPlanetRequest),
  });
}

export async function getPlanetLeaderboard(planetId: string, period = "week"): Promise<LeaderboardResponse> {
  if (isDemoSession()) {
    const leaderboard = getDemoLeaderboard(planetId);
    return clone({
      ...leaderboard,
      period,
    });
  }
  return request<LeaderboardResponse>(`/leaderboard/planet/${planetId}?period=${period}`);
}

export async function submitGameRun(gameCode: GameCode, payload: GameRunSubmitRequest): Promise<GameRunEntry> {
  if (isDemoSession()) {
    const planetId = getDemoPlanetId(resolvePlanetId(gameCode, payload.planet_id));
    const planet = demoSessionState.planets.planets.find((entry) => entry.id === planetId);
    const progress = demoSessionState.planetProgress[planetId];
    const leaderboard = getDemoLeaderboard(planetId);
    const leaderboardEntry = leaderboard.leaders.find((entry) => entry.user_id === DEMO_SESSION_USER_ID);
    const smallStarAwarded = payload.score > 0;

    progress.game.daily_attempts_used = Math.min(progress.game.daily_attempts_limit, progress.game.daily_attempts_used + 1);
    demoSessionState.me.daily_game_attempts_used = Math.min(
      demoSessionState.me.daily_game_attempts_limit,
      demoSessionState.me.daily_game_attempts_used + 1,
    );

    if (smallStarAwarded) {
      progress.period_small_stars += 1;
      progress.constellation.small_stars_current = Math.min(
        progress.constellation.small_stars_per_segment,
        progress.constellation.small_stars_current + 1,
      );
      demoSessionState.me.total_constellations_sum += 1;
      if (planet) {
        planet.progress_percent = Math.min(100, planet.progress_percent + 4);
        planet.cashback_percent = Math.min(7.5, Number((planet.cashback_percent + 0.1).toFixed(1)));
        progress.cashback_percent = planet.cashback_percent;
      }
      leaderboard.my_stars += 1;
      if (leaderboardEntry?.stars !== undefined) {
        leaderboardEntry.stars += 1;
      }
    }

    return {
      game_code: gameCode,
      score: payload.score,
      total_reward: smallStarAwarded ? 1 : 0,
      small_star_awarded: smallStarAwarded,
      remaining_attempts_today: Math.max(0, progress.game.daily_attempts_limit - progress.game.daily_attempts_used),
      planet_progress: clone(progress),
    };
  }
  const response = await request<{
    small_star_awarded: boolean;
    remaining_attempts_today: number;
    planet_progress: PlanetProgressResponse;
  }>(`/games/${gameCode}/runs`, {
    method: "POST",
    body: JSON.stringify({
      score: payload.score,
      planet_id: resolvePlanetId(gameCode, payload.planet_id),
    }),
  });

  return {
    game_code: gameCode,
    score: payload.score,
    total_reward: response.small_star_awarded ? 1 : 0,
    small_star_awarded: response.small_star_awarded,
    remaining_attempts_today: response.remaining_attempts_today,
    planet_progress: response.planet_progress,
  };
}

export async function getProfile(): Promise<GalaxyProfile> {
  const [me, rewards] = await Promise.all([getMe(), getRewards()]);

  return {
    user: {
      user_id: me.id,
      phone: me.phone,
      display_name: me.name,
      segment: "student",
      created_at: new Date(0).toISOString(),
    },
    orbit_level: 1,
    total_energy: 0,
    total_xp: 0,
    stardust: 0,
    bonus_streak: 0,
    vault_charge: 0,
    vault_crates: 0,
    selected_planet: "ORBIT_COMMERCE",
    planets: [],
    active_boosters: [],
    quests: [],
    reward_ledger_preview: rewards,
    activity: [],
    installment_profile: {
      current_limit: 0,
      available_limit: 0,
      risk_score: 0,
      on_time_payments_3m: 0,
      late_flags: 0,
    },
  };
}

export async function getQuests(): Promise<QuestItem[]> {
  return [];
}

export async function claimQuest(_: string): Promise<RewardEntry> {
  throw new Error("Quest claiming is not available in the current mock server.");
}

export async function getRewards(): Promise<RewardEntry[]> {
  const payload = await getPromocodes();
  return payload.promocodes.map((promo) => ({
    ledger_id: promo.code,
    status: promo.used_at ? "used" : "active",
    created_at: promo.issued_at,
    title: promo.code,
    description: `Промокод для планеты ${promo.planet_id}`,
  }));
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const planets = await getPlanetsList();
  const defaultPlanetId = planets.planets[0]?.id;
  if (!defaultPlanetId) {
    return [];
  }
  const response = await getPlanetLeaderboard(defaultPlanetId);
  return response.leaders.map((entry) => ({
    user_id: entry.user_id,
    display_name: entry.name,
    name: entry.name,
    avatar_url: entry.avatar_url,
    total_stars: entry.stars,
    stars: entry.stars,
    rank: entry.rank,
    bank_rank: `Топ #${entry.rank ?? 0}`,
    rating_score: entry.stars ?? 0,
    cashback_balance: 0,
    orbit_level: 1,
    total_xp: entry.stars ?? 0,
  }));
}

export async function getGameSummary(): Promise<GameSummary> {
  if (isDemoSession()) {
    return {
      total_runs: demoSessionState.me.daily_game_attempts_used,
      total_reward: demoSessionState.me.total_constellations_sum,
      total_cashback: 0,
      total_bonus_points: 0,
      games: FALLBACK_SUMMARY_GAMES,
    };
  }
  return {
    total_runs: 0,
    total_reward: 0,
    total_cashback: 0,
    total_bonus_points: 0,
    games: FALLBACK_SUMMARY_GAMES,
  };
}
