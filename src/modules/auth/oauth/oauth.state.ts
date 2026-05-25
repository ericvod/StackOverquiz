import { randomBytes } from "node:crypto";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const oauthStateStore = new Map<
  string,
  {
    provider: "google" | "github";
    expiresAt: number;
  }
>();

function cleanupExpiredStates() {
  const now = Date.now();

  for (const [state, value] of oauthStateStore.entries()) {
    if (value.expiresAt <= now) {
      oauthStateStore.delete(state);
    }
  }
}

export function issueOAuthState(provider: "google" | "github") {
  cleanupExpiredStates();

  const state = randomBytes(24).toString("hex");
  oauthStateStore.set(state, {
    provider,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  });

  return state;
}

export function consumeOAuthState(provider: "google" | "github", state: string) {
  cleanupExpiredStates();

  const value = oauthStateStore.get(state);
  if (!value || value.provider !== provider || value.expiresAt <= Date.now()) {
    return false;
  }

  oauthStateStore.delete(state);
  return true;
}
