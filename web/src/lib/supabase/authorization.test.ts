import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  isAllowedPracticeUser,
  isTuanotuanQuestionAdmin,
} from "./authorization";

describe("practice user authorization", () => {
  it("allows every authenticated account, including email/password accounts", () => {
    expect(isAllowedPracticeUser(user({ identities: [] }))).toBe(true);
    expect(isAllowedPracticeUser(user({ aud: "anon" }))).toBe(false);
  });

  it("allows question-bank mutation only for the trusted tuanotuan GitHub identity", () => {
    expect(
      isTuanotuanQuestionAdmin(
        user({ identities: [identity("github", { user_name: "TuanOTuan" })] }),
      ),
    ).toBe(true);
    expect(
      isTuanotuanQuestionAdmin(
        user({ identities: [identity("github", { user_name: "another-admin" })] }),
      ),
    ).toBe(false);
    expect(
      isTuanotuanQuestionAdmin(
        user({ user_metadata: { user_name: "tuanotuan" }, identities: [] }),
      ),
    ).toBe(false);
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
