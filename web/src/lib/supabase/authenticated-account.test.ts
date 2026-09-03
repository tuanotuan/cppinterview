import { describe, expect, it } from "vitest";

import { authenticatedAccountIdFromClaims } from "./authenticated-account";

describe("authenticatedAccountIdFromClaims", () => {
  it("returns the subject only for a permanent authenticated account", () => {
    expect(
      authenticatedAccountIdFromClaims({
        aud: "authenticated",
        sub: "11111111-1111-4111-8111-111111111111",
        is_anonymous: false,
      }),
    ).toBe("11111111-1111-4111-8111-111111111111");
    expect(
      authenticatedAccountIdFromClaims({
        aud: ["authenticated"],
        sub: "22222222-2222-4222-8222-222222222222",
      }),
    ).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("rejects anonymous identities and non-authenticated audiences", () => {
    expect(
      authenticatedAccountIdFromClaims({
        aud: "authenticated",
        sub: "11111111-1111-4111-8111-111111111111",
        is_anonymous: true,
      }),
    ).toBeNull();
    expect(
      authenticatedAccountIdFromClaims({
        aud: "authenticated",
        sub: "11111111-1111-4111-8111-111111111111",
        is_anonymous: "true",
      }),
    ).toBeNull();
    expect(
      authenticatedAccountIdFromClaims({ aud: "anon", sub: "someone" }),
    ).toBeNull();
    expect(
      authenticatedAccountIdFromClaims({
        aud: "authenticated",
        sub: "not-a-postgres-uuid",
      }),
    ).toBeNull();
  });
});
