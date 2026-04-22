import React from "react";
import { createRoot } from "react-dom/client";
import "./global.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001/v1";
const existingProcess = globalThis.process ?? {};

globalThis.global = globalThis;
globalThis.process = {
  ...existingProcess,
  env: {
    ...existingProcess.env,
    API_BASE_URL: apiBaseUrl,
    NODE_ENV: import.meta.env.MODE,
  },
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

const { default: App } = await import("../../mobile/src/app/App");
const { installDemoLoginShortcut } = await import("./installDemoLoginShortcut");

installDemoLoginShortcut();

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
