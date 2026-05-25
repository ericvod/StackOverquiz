import { beforeEach, describe, expect, test } from "bun:test";
import { findOrCreateOAuthUser } from "../../../src/modules/auth/auth.service";
import { ConflictError } from "../../../src/shared/errors";
import { resetDatabase } from "../../helpers/db";

describe("OAuth account linking", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("treats oauth ids as provider-scoped identities", async () => {
    const googleUser = await findOrCreateOAuthUser({
      email: "google-user@example.com",
      username: "oauth_google_user",
      provider: "google",
      oauthId: "shared-oauth-id",
      avatarUrl: "https://example.com/google.png",
    });

    const githubUser = await findOrCreateOAuthUser({
      email: "github-user@example.com",
      username: "oauth_github_user",
      provider: "github",
      oauthId: "shared-oauth-id",
      avatarUrl: "https://example.com/github.png",
    });

    expect(googleUser.id).not.toBe(githubUser.id);
    expect(googleUser.oauthProvider).toBe("google");
    expect(githubUser.oauthProvider).toBe("github");
  });

  test("does not silently overwrite a different oauth provider already linked to the same email", async () => {
    await findOrCreateOAuthUser({
      email: "linked@example.com",
      username: "oauth_linked_google",
      provider: "google",
      oauthId: "google-id",
    });

    await expect(
      findOrCreateOAuthUser({
        email: "linked@example.com",
        username: "oauth_linked_github",
        provider: "github",
        oauthId: "github-id",
      }),
    ).rejects.toThrow(new ConflictError("Email already linked to another OAuth provider"));
  });
});
