import { env } from "../../../config/env";
import { BadGatewayError } from "../../../shared/errors";
import { ERROR_CODES } from "../../../shared/http/error-codes";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function readErrorMessage(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getGoogleUser(code: string) {
  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const message = await readErrorMessage(tokenRes);
    throw new BadGatewayError(
      `Google token exchange failed${message ? `: ${message}` : ""}`,
      ERROR_CODES.OAUTH_GOOGLE_TOKEN_EXCHANGE_FAILED,
    );
  }

  const tokens = (await tokenRes.json()) as { access_token: string };

  // Get user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    const message = await readErrorMessage(userRes);
    throw new BadGatewayError(
      `Google user info failed${message ? `: ${message}` : ""}`,
      ERROR_CODES.OAUTH_GOOGLE_USERINFO_FAILED,
    );
  }

  const user = (await userRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };

  return {
    oauthId: user.id,
    email: user.email,
    username: user.name,
    avatarUrl: user.picture,
    provider: "google" as const,
  };
}
