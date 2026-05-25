import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../../src/config/database";
import { users } from "../../../src/db/schema";
import { register } from "../../../src/modules/auth/auth.service";
import { createOrPromoteAdmin } from "../../../src/modules/users/admin.service";
import { makeUserInput } from "../../factories/user.factory";
import { resetDatabase } from "../../helpers/db";

describe("Admin management", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("creates a brand new admin when email, username, and password are provided", async () => {
    const result = await createOrPromoteAdmin({
      email: "admin@example.com",
      username: "admin_mobile",
      password: "super-strong-pass-123",
    });

    expect(result.action).toBe("created");
    expect(result.user.role).toBe("admin");
    expect(result.passwordUpdated).toBe(true);

    const storedUser = await db.query.users.findFirst({
      where: eq(users.email, "admin@example.com"),
    });

    expect(storedUser?.role).toBe("admin");
    expect(storedUser?.passwordHash).toBeTruthy();
  });

  test("promotes an existing user to admin without changing the password when none is provided", async () => {
    const existingUser = await register(makeUserInput());

    const result = await createOrPromoteAdmin({
      email: existingUser.email,
    });

    expect(result.action).toBe("promoted");
    expect(result.passwordUpdated).toBe(false);
    expect(result.user.role).toBe("admin");

    const promotedUser = await db.query.users.findFirst({
      where: eq(users.id, existingUser.id),
    });

    expect(promotedUser?.role).toBe("admin");
    expect(promotedUser?.passwordHash).toBeTruthy();
  });
});
