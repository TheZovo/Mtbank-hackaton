import { Platform } from "react-native";

const runtimeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
const envApiBaseUrl = runtimeProcess?.env?.API_BASE_URL;
const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_BASE_URL = envApiBaseUrl ?? `http://${defaultHost}:8001/v1`;
