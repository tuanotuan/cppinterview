import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getClaims: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { GET } from "./route";

describe("GET /api/auth/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getClaims: mocks.getClaims },
    });
  });

  it("reports a guest without touching Supabase when auth is not configured", async () => {
    mocks.isSupabaseConfigured.mockReturnValue(false);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ authenticated: false });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("reports a verified non-anonymous account without exposing identity data", async () => {
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          aud: "authenticated",
          sub: "11111111-1111-4111-8111-111111111111",
          is_anonymous: false,
          email: "private@example.com",
        },
      },
      error: null,
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ authenticated: true });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
  });

  it("does not treat an anonymous Supabase identity as a signed-in account", async () => {
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          aud: ["authenticated"],
          sub: "22222222-2222-4222-8222-222222222222",
          is_anonymous: true,
        },
      },
      error: null,
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });

  it("fails closed to guest UI without leaking authentication errors", async () => {
    mocks.getClaims.mockRejectedValue(new Error("private auth failure"));

    const response = await GET();
    const payload = await response.json();

    expect(payload).toEqual({ authenticated: false });
    expect(JSON.stringify(payload)).not.toContain("private auth failure");
  });
});
