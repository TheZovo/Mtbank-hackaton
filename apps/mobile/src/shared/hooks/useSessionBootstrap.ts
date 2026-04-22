import { useEffect } from "react";
import { getMe, logout } from "../api/client";
import { useSessionStore } from "../state/session-store";

export function useSessionBootstrap() {
  const hydrate = useSessionStore((state) => state.hydrate);
  const clear = useSessionStore((state) => state.clear);
  const updateMe = useSessionStore((state) => state.updateMe);
  const status = useSessionStore((state) => state.status);
  const accessToken = useSessionStore((state) => state.accessToken);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }
    void getMe()
      .then((me) => {
        updateMe(me);
      })
      .catch(async () => {
        await logout().catch(() => undefined);
        await clear();
      });
  }, [accessToken, clear, status, updateMe]);
}
