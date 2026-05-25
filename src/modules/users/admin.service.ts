import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../../config/database";
import { users } from "../../db/schema";
import { BadRequestError, ConflictError } from "../../shared/errors";

const SALT_ROUNDS = 12;

export type CreateOrPromoteAdminInput = {
  email?: string;
  username?: string;
  password?: string;
};

export type AdminMutationResult = {
  action: "created" | "promoted" | "updated" | "unchanged";
  passwordUpdated: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    role: "admin";
  };
};

function normalizeOptionalValue(value?: string) {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : undefined;
}

function ensurePasswordPolicy(password: string) {
  if (password.length < 12) {
    throw new BadRequestError("Admin password must have at least 12 characters");
  }
}

function ensureLookupInput(email?: string, username?: string) {
  if (!email && !username) {
    throw new BadRequestError("Provide at least one identifier: email or username");
  }
}

function toAdminSummary(user: { id: string; email: string; username: string }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: "admin" as const,
  };
}

/**
 * Creates a new admin account or promotes an existing account to admin.
 *
 * @remarks
 * - Creating a new admin requires `email`, `username`, and `password`.
 * - Promoting an existing account can use `email`, `username`, or both.
 * - When `password` is provided for an existing account, the local password hash is rotated.
 */
export async function createOrPromoteAdmin(input: CreateOrPromoteAdminInput): Promise<AdminMutationResult> {
  const email = normalizeOptionalValue(input.email);
  const username = normalizeOptionalValue(input.username);
  const password = normalizeOptionalValue(input.password);

  ensureLookupInput(email, username);

  if (password) {
    ensurePasswordPolicy(password);
  }

  const [existingByEmail, existingByUsername] = await Promise.all([
    email
      ? db.query.users.findFirst({
          where: eq(users.email, email),
        })
      : Promise.resolve(undefined),
    username
      ? db.query.users.findFirst({
          where: eq(users.username, username),
        })
      : Promise.resolve(undefined),
  ]);

  if (existingByEmail && existingByUsername && existingByEmail.id !== existingByUsername.id) {
    throw new ConflictError("Provided email and username belong to different accounts");
  }

  const existingUser = existingByEmail ?? existingByUsername;

  if (existingUser) {
    if (email && existingUser.email !== email) {
      throw new ConflictError("Provided email does not match the existing account located by username");
    }

    if (username && existingUser.username !== username) {
      throw new ConflictError("Provided username does not match the existing account located by email");
    }

    if (existingUser.role === "admin" && !password) {
      return {
        action: "unchanged",
        passwordUpdated: false,
        user: toAdminSummary(existingUser),
      };
    }

    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined;

    const [updatedUser] = await db
      .update(users)
      .set({
        role: "admin",
        updatedAt: new Date(),
        ...(passwordHash ? { passwordHash } : {}),
      })
      .where(eq(users.id, existingUser.id))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
      });

    return {
      action: existingUser.role === "admin" ? "updated" : "promoted",
      passwordUpdated: Boolean(passwordHash),
      user: toAdminSummary(updatedUser!),
    };
  }

  if (!email || !username || !password) {
    throw new BadRequestError("Creating a new admin requires email, username, and password");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      username,
      passwordHash,
      role: "admin",
    })
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
    });

  return {
    action: "created",
    passwordUpdated: true,
    user: toAdminSummary(createdUser!),
  };
}
