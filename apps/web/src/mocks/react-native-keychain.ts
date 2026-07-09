interface KeychainOptions {
  service?: string;
}

interface StoredCredentials {
  username: string;
  password: string;
  service: string;
}

const DEFAULT_SERVICE = "default";

function storageKey(options?: KeychainOptions) {
  return `mtb-web-keychain:${options?.service ?? DEFAULT_SERVICE}`;
}

export async function setGenericPassword(username: string, password: string, options?: KeychainOptions) {
  const service = options?.service ?? DEFAULT_SERVICE;
  const credentials: StoredCredentials = { username, password, service };
  localStorage.setItem(storageKey(options), JSON.stringify(credentials));
  return true;
}

export async function getGenericPassword(options?: KeychainOptions) {
  const raw = localStorage.getItem(storageKey(options));
  if (!raw) {
    return false;
  }
  return JSON.parse(raw) as StoredCredentials;
}

export async function resetGenericPassword(options?: KeychainOptions) {
  localStorage.removeItem(storageKey(options));
  return true;
}
