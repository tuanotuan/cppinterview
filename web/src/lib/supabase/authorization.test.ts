import type { User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import { isAllowedPracticeUser } from "./authorization";

const originalAllowedLogin = process.env.ALLOWED_GITHUB_LOGIN;
const originalAllowedUserId = process.env.ALLOWED_SUPABASE_USER_ID;

afterEach(() => {
  restoreEnv("ALLOWED_GITHUB_LOGIN", originalAllowedLogin);
  restoreEnv("ALLOWED_SUPABASE_USER_ID", originalAllowedUserId);
});

describe("practice user authorization", () => {
  it("does not implicitly allow a GitHub login when the allowlist is unset", () => {
    delete process.env.ALLOWED_GITHUB_LOGIN;
    delete process.env.ALLOWED_SUPABASE_USER_ID;

    expect(
      isAllowedPracticeUser(
        user({
          identities: [
            identity("github", { user_name: "tuanotuan" }),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects a forged login stored only in user-editable metadata", () => {
    process.env.ALLOWED_GITHUB_LOGIN = "tuanotuan";
    delete process.env.ALLOWED_SUPABASE_USER_ID;

    expect(
      isAllowedPracticeUser(
        user({
          user_metadata: { user_name: "tuanotuan" },
          identities: [],
        }),
      ),
    ).toBe(false);
  });

  it("accepts an allowed login from the GitHub provider identity", () => {
    process.env.ALLOWED_GITHUB_LOGIN = "TuanOTuan";
    delete process.env.ALLOWED_SUPABASE_USER_ID;

    expect(
      isAllowedPracticeUser(
        user({
          user_metadata: { user_name: "forged-value-is-ignored" },
          identities: [
            identity("github", { user_name: "tuanotuan" }),
          ],
        }),
      ),
    ).toBe(true);
  });

  it("rejects the same login when it comes from another provider", () => {
    process.env.ALLOWED_GITHUB_LOGIN = "tuanotuan";
    delete process.env.ALLOWED_SUPABASE_USER_ID;

    expect(
      isAllowedPracticeUser(
        user({
          identities: [
            identity("gitlab", { user_name: "tuanotuan" }),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("allows an explicit empty GitHub allowlist to disable login matching", () => {
    process.env.ALLOWED_GITHUB_LOGIN = "";
    delete process.env.ALLOWED_SUPABASE_USER_ID;

    expect(
      isAllowedPracticeUser(
        user({
          identities: [
            identity("github", { user_name: "tuanotuan" }),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("accepts an explicitly allowed immutable Supabase user ID", () => {
    process.env.ALLOWED_GITHUB_LOGIN = "someone-else";
    process.env.ALLOWED_SUPABASE_USER_ID =
      "11111111-1111-4111-8111-111111111111";

    expect(
      isAllowedPracticeUser(
        user({
          id: "11111111-1111-4111-8111-111111111111",
          identities: [],
        }),
      ),
    ).toBe(true);
  });
});

function user(overrides: Partial<User> = {}): User {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-07-29T00:00:00.000Z",
    ...overrides,
  } as User;
}

function identity(
  provider: string,
  identityData: Record<string, unknown>,
) {
  return {
    id: `${provider}-identity`,
    identity_id: `${provider}-identity`,
    user_id: "22222222-2222-4222-8222-222222222222",
    provider,
    identity_data: identityData,
    created_at: "2026-07-29T00:00:00.000Z",
    updated_at: "2026-07-29T00:00:00.000Z",
    last_sign_in_at: "2026-07-29T00:00:00.000Z",
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
