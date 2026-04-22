import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectRoot, "../..");

function fromWebRoot(relativePath: string) {
  return path.resolve(projectRoot, relativePath);
}

export default defineConfig(({ mode }) => ({
  define: {
    __DEV__: JSON.stringify(mode !== "production"),
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: fromWebRoot("src/mocks/react-native.ts") },
      { find: "react-native-reanimated", replacement: fromWebRoot("src/mocks/react-native-reanimated.ts") },
      { find: "react-native-view-shot", replacement: fromWebRoot("src/mocks/react-native-view-shot.ts") },
      { find: "react-native-keychain", replacement: fromWebRoot("src/mocks/react-native-keychain.ts") },
      { find: "react-native-mmkv", replacement: fromWebRoot("src/mocks/react-native-mmkv.ts") },
      { find: "@react-native-clipboard/clipboard", replacement: fromWebRoot("src/mocks/clipboard.ts") },
    ],
    extensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
    },
  },
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
}));
