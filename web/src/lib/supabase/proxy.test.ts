import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { createServerClient, getClaims, getUser } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("./config", () => ({
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    publishableKey: "publishable-key",
  }),
  isSupabaseConfigured: () => true,
}));

import { updateSupabaseSession } from "./proxy";

describe("updateSupabaseSession", () => {
  it("refreshes and verifies the session with claims instead of fetching a user record", async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    createServerClient.mockReturnValue({ auth: { getClaims, getUser } });

    await updateSupabaseSession(new NextRequest("https://cppinterview.test/practice"));

    expect(getClaims).toHaveBeenCalledOnce();
    expect(getUser).not.toHaveBeenCalled();
  });
});
