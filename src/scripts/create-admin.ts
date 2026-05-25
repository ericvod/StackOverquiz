function printUsage() {
  console.log(`
Create or promote an admin account.

Usage:
  bun run admin:create -- --email admin@example.com --username admin_local --password "strong-password-123"
  bun run admin:create -- --email existing-user@example.com
  bun run admin:create -- --username existing_user --password "rotate-password-123"

Rules:
  - To create a new admin, provide email, username, and password.
  - To promote an existing account, provide email or username.
  - If password is provided for an existing account, the local password is updated.
  - Admin passwords must have at least 12 characters.
`);
}

function readArgValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const email = readArgValue(args, "--email");
  const username = readArgValue(args, "--username");
  const password = readArgValue(args, "--password");

  const [{ createOrPromoteAdmin }, { closeDatabase }] = await Promise.all([
    import("../modules/users/admin.service"),
    import("../config/database"),
  ]);

  try {
    const result = await createOrPromoteAdmin({
      email,
      username,
      password,
    });

    const actionLabel = {
      created: "created",
      promoted: "promoted to admin",
      updated: "updated",
      unchanged: "already admin",
    }[result.action];

    console.log(`Admin ${actionLabel}:`);
    console.log(`- id: ${result.user.id}`);
    console.log(`- email: ${result.user.email}`);
    console.log(`- username: ${result.user.username}`);
    console.log(`- role: ${result.user.role}`);
    console.log(`- password updated: ${result.passwordUpdated ? "yes" : "no"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to create or promote admin: ${message}`);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
