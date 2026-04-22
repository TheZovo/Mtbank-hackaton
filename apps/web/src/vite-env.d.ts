/// <reference types="vite/client" />

declare global {
  var __DEV__: boolean;
  var global: typeof globalThis;
  var process:
    | {
        env?: Record<string, string | undefined>;
      }
    | undefined;
}

export {};
