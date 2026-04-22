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
  return request<MeResponse>("/me");
}

export async function getPromocodes(): Promise<PromoCodesResponse> {
  return request<PromoCodesResponse>("/promocodes");
}

export async function getReferrals(): Promise<ReferralsResponse> {
  return request<ReferralsResponse>("/referrals");
}

export async function createReferral(payload: ReferralCreateRequest): Promise<ReferralCreateResponse> {
  return request<ReferralCreateResponse>("/referrals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPlanetsList(): Promise<PlanetsListResponse> {
  return request<PlanetsListResponse>("/planets/list");
}

export async function getPlanetProgress(planetId: string): Promise<PlanetProgressResponse> {
  return request<PlanetProgressResponse>(`/planets/${planetId}/progress`);
}

export async function setFocusPlanet(planetId: string, focus = true) {
  return request<{ status: string }>(`/planets/${planetId}/focus`, {
    method: "PATCH",
    body: JSON.stringify({ focus } satisfies FocusPlanetRequest),
  });
}

export async function getPlanetLeaderboard(planetId: string, period = "week"): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>(`/leaderboard/planet/${planetId}?period=${period}`);
}

export async function submitGameRun(gameCode: GameCode, payload: GameRunSubmitRequest): Promise<GameRunEntry> {
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
  return {
    total_runs: 0,
    total_reward: 0,
    total_cashback: 0,
    total_bonus_points: 0,
    games: FALLBACK_SUMMARY_GAMES,
  };
}
