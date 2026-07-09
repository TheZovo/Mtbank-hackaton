import { useSessionStore } from "../../mobile/src/shared/state/session-store";

const demoUser = {
  id: "web-demo-user",
  phone: "+375000000000",
  name: "Demo User",
  daily_game_attempts_used: 0,
  daily_game_attempts_limit: 5,
  total_constellations_sum: 0,
  average_cashback: 0,
};

export function installDemoLoginShortcut() {
  const button = document.createElement("button");
  button.className = "demo-login-button";
  button.type = "button";
  button.textContent = "Войти без телефона";

  function syncVisibility() {
    const status = useSessionStore.getState().status;
    button.hidden = status !== "anonymous";
  }

  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Входим...";
    void useSessionStore
      .getState()
      .setSession({
        accessToken: "",
        refreshToken: "",
        me: demoUser,
      })
      .finally(() => {
        button.disabled = false;
        button.textContent = "Войти без телефона";
        syncVisibility();
      });
  });

  document.body.append(button);
  syncVisibility();
  return useSessionStore.subscribe(syncVisibility);
}
