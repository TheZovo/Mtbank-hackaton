import type { MeResponse } from "@mtb/contracts";
import { create } from "zustand";
import { clearStoredSession, readStoredSession, saveStoredSession } from "../storage/secure-session";
import { preferencesStorage } from "../storage/preferences";

const ME_KEY = "current-me";

type SessionStatus = "hydrating" | "anonymous" | "authenticated";

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  refreshToken: string | null;
  me: MeResponse | null;
  setSession: (payload: { accessToken: string; refreshToken: string; me: MeResponse }) => Promise<void>;
  updateMe: (me: MeResponse) => void;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
}

function readPersistedMe(): MeResponse | null {
  const raw = preferencesStorage.getString(ME_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as MeResponse;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "hydrating",
  accessToken: null,
  refreshToken: null,
  me: readPersistedMe(),
  setSession: async ({ accessToken, refreshToken, me }) => {
    await saveStoredSession({ accessToken, refreshToken });
    preferencesStorage.set(ME_KEY, JSON.stringify(me));
    set({
      status: "authenticated",
      accessToken,
      refreshToken,
      me,
    });
  },
  updateMe: (me) => {
    preferencesStorage.set(ME_KEY, JSON.stringify(me));
    set({ me, status: "authenticated" });
  },
  hydrate: async () => {
    const storedSession = await readStoredSession();
    if (!storedSession) {
      set({ status: "anonymous", accessToken: null, refreshToken: null, me: null });
      return;
    }
    set({
      status: "authenticated",
      accessToken: storedSession.accessToken,
      refreshToken: storedSession.refreshToken,
      me: readPersistedMe(),
    });
  },
  clear: async () => {
    await clearStoredSession();
    preferencesStorage.delete(ME_KEY);
    set({ status: "anonymous", accessToken: null, refreshToken: null, me: null });
  },
}));
