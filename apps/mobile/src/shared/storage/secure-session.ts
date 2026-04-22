import * as Keychain from "react-native-keychain";

const SERVICE = "mtb-galaxy-session";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export async function saveStoredSession(payload: StoredSession): Promise<void> {
  await Keychain.setGenericPassword("session", JSON.stringify(payload), {
    service: SERVICE,
  });
}

export async function readStoredSession(): Promise<StoredSession | null> {
  const credentials = await Keychain.getGenericPassword({ service: SERVICE });
  if (!credentials) {
    return null;
  }
  return JSON.parse(credentials.password) as StoredSession;
}

export async function clearStoredSession(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
