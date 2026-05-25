let userSequence = 0;

export function makeUserInput(overrides: Partial<{ username: string; email: string; password: string }> = {}) {
  userSequence += 1;

  return {
    username: overrides.username ?? `test_user_${userSequence}`,
    email: overrides.email ?? `test_user_${userSequence}@example.com`,
    password: overrides.password ?? "test-password-123",
  };
}
