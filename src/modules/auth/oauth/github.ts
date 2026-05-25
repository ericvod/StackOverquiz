import { env } from "../../../config/env";
import { BadGatewayError } from "../../../shared/errors";
import { ERROR_CODES } from "../../../shared/http/error-codes";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

export function getGithubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    scope: "read:user user:email",
    state,
  });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

async function readErrorMessage(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function getGithubUser(code: string) {
  // Exchange code for token
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const message = await readErrorMessage(tokenRes);
    throw new BadGatewayError(
      `GitHub token exchange failed${message ? `: ${message}` : ""}`,
      ERROR_CODES.OAUTH_GITHUB_TOKEN_EXCHANGE_FAILED,
    );
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Get user profile
  const userRes = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
    },
  });

  if (!userRes.ok) {
    const message = await readErrorMessage(userRes);
    throw new BadGatewayError(
      `GitHub user info failed${message ? `: ${message}` : ""}`,
      ERROR_CODES.OAUTH_GITHUB_USERINFO_FAILED,
    );
  }

  const user = (await userRes.json()) as {
    id: number;
    login: string;
    avatar_url: string;
    email: string | null;
  };

  // If email is private, fetch it from /user/emails
  let email = user.email;
  if (!email) {
    const emailsRes = await fetch(GITHUB_EMAILS_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    if (!emailsRes.ok) {
      const message = await readErrorMessage(emailsRes);
      throw new BadGatewayError(
        `GitHub email lookup failed${message ? `: ${message}` : ""}`,
        ERROR_CODES.OAUTH_GITHUB_EMAILS_FAILED,
      );
    }

    const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
    const primary = emails.find((e) => e.primary && e.verified);
    email = primary?.email ?? emails[0]?.email ?? `${user.id}@github.noemail`;
  }

  return {
    oauthId: String(user.id),
    email,
    username: user.login,
    avatarUrl: user.avatar_url,
    provider: "github" as const,
  };
}
