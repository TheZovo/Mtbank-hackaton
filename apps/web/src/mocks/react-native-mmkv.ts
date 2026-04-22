interface MMKVOptions {
  id?: string;
}

function storageKey(id: string, key: string) {
  return `mtb-web-mmkv:${id}:${key}`;
}

export function createMMKV(options?: MMKVOptions) {
  const id = options?.id ?? "default";

  return {
    getString(key: string) {
      return localStorage.getItem(storageKey(id, key)) ?? undefined;
    },
    set(key: string, value: string | number | boolean) {
      localStorage.setItem(storageKey(id, key), String(value));
    },
    remove(key: string) {
      localStorage.removeItem(storageKey(id, key));
    },
    delete(key: string) {
      localStorage.removeItem(storageKey(id, key));
    },
    clearAll() {
      const prefix = `mtb-web-mmkv:${id}:`;
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      }
    },
  };
}
