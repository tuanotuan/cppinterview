import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readPasswordCapability } from "./password-capability.server";

describe("readPasswordCapability", () => {
  it("uses the mirrored auth.users capability as the source of truth", async () => {
    const supabase = capabilityClient({ data: { has_password: false }, error: null });

    await expect(
      readPasswordCapability(supabase, authUser({ providers: ["email"] })),
    ).resolves.toEqual({ hasPassword: false, source: "database" });
  });

  it("detects an OAuth-first account whose password was backfilled", async () => {
    const supabase = capabilityClient({ data: { has_password: true }, error: null });

    await expect(
      readPasswordCapability(supabase, authUser({ providers: ["google"] })),
    ).resolves.toEqual({ hasPassword: true, source: "database" });
  });

  it("falls back to the email provider during a rolling database deploy", async () => {
    const supabase = capabilityClient({
      data: null,
      error: { code: "42P01", message: "relation does not exist" },
    });

    await expect(
      readPasswordCapability(supabase, authUser({ providers: ["email"] })),
    ).resolves.toEqual({
      hasPassword: true,
      source: "auth-provider-fallback",
    });
  });

  it("does not claim that an OAuth-only fallback has a password", async () => {
    const supabase = capabilityClient({ data: null, error: null });

    await expect(
      readPasswordCapability(supabase, authUser({ providers: ["google"] })),
    ).resolves.toEqual({
      hasPassword: false,
      source: "auth-provider-fallback",
    });
  });
});

function authUser({ providers }: { providers: string[] }) {
  return {
    id: "account-1",
    app_metadata: { provider: providers[0], providers },
    identities: providers.map((provider) => ({ provider })),
  } as Pick<User, "id" | "app_metadata" | "identities">;
}

function capabilityClient(result: {
  data: { has_password: boolean } | null;
  error: { code: string; message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return {
    from: vi.fn(() => ({ select })),
  } as unknown as SupabaseClient;
}
