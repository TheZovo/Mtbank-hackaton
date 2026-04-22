import type {
  AuthLoginResponse,
  AuthRequestOtpRequest,
  AuthRequestOtpResponse,
  AuthRefreshRequest,
  FocusPlanetRequest,
  GameCode,
  GameRunEntry,
  GameRunSubmitRequest,
  GameSummary,
  GalaxyProfile,
  LeaderboardEntry,
  MeResponse,
  QuestItem,
  ReferralCreateRequest,
  ReferralEntry,
  RewardEntry,
} from "@mtb/contracts";
import { API_BASE_URL } from "../config/env";
import { useSessionStore } from "../state/session-store";

async function parseError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as { detail?: string };
    return new Error(payload.detail ?? `API error ${response.status}`);
  } catch {
    return new Error(`API error ${response.status}`);
  }
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
    const me =
      state.me ??
      ((await fetch(`${API_BASE_URL}/me`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshed.access_token}`,
        },
      }).then(async (refreshResponse) => {
        if (!refreshResponse.ok) {
          throw await parseError(refreshResponse);
        }
        return refreshResponse.json();
      })) as MeResponse);
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

export async function requestOtp(payload: AuthRequestOtpRequest): Promise<AuthRequestOtpResponse> {
  return request<AuthRequestOtpResponse>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  }, false);
}

export async function verifyOtp(payload: {
  challenge_id: string;
  phone: string;
  otp_code: string;
  display_name?: string;
  segment?: "student" | "first-jobber" | "freelancer";
}): Promise<AuthLoginResponse> {
  return request<AuthLoginResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  }, false);
}

export async function refreshTokens(payload: AuthRefreshRequest) {
  return request<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in_seconds: number;
  }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  }, false);
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

export async function getProfile(): Promise<GalaxyProfile> {
  return request<GalaxyProfile>("/profile");
}

export async function setFocusPlanet(payload: FocusPlanetRequest): Promise<GalaxyProfile> {
  return request<GalaxyProfile>("/profile/focus-planet", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getQuests(): Promise<QuestItem[]> {
  return request<QuestItem[]>("/quests");
}

export async function claimQuest(questId: string): Promise<RewardEntry> {
  return request<RewardEntry>(`/quests/${questId}/claim`, {
    method: "POST",
  });
}

export async function getRewards(): Promise<RewardEntry[]> {
  return request<RewardEntry[]>("/rewards/ledger");
}

export async function getReferrals(): Promise<ReferralEntry[]> {
  return request<ReferralEntry[]>("/referrals");
}

export async function createReferral(payload: ReferralCreateRequest): Promise<ReferralEntry> {
  return request<ReferralEntry>("/referrals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>("/leaderboard");
}

export async function submitGameRun(gameCode: GameCode, payload: GameRunSubmitRequest): Promise<GameRunEntry> {
  return request<GameRunEntry>(`/games/${gameCode}/runs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getGameSummary(): Promise<GameSummary> {
  return request<GameSummary>("/games/summary");
}
