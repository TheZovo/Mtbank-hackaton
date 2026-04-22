import { createMMKV } from "react-native-mmkv";

export const preferencesStorage = createMMKV({
  id: "mtb-galaxy-preferences",
});
