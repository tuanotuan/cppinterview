import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PUBLIC_AI_QUOTA_LIMIT,
  PublicAiQuotaConfigurationError,
  PublicAiQuotaExceededError,
  createPublicAiDeviceToken,
  createPublicAiQuotaAdminClient,
  parsePublicAiQuotaReservation,
  publicAiQuotaIdentityHash,
  readPublicAiClientIp,
} from "./public-ai-quota.server";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public AI quota identity", () => {
  it("hashes the same identity deterministically without returning the raw value", () => {
    vi.stubEnv("PUBLIC_AI_QUOTA_IDENTITY_PEPPER", "test-pepper");

    const first = publicAiQuotaIdentityHash("ip", "203.0.113.7");
    const second = publicAiQuotaIdentityHash("ip", "203.0.113.7");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.7");
    expect(publicAiQuotaIdentityHash("device", "203.0.113.7")).not.toBe(first);
  });

  it("creates a high-entropy device token", () => {
    const token = createPublicAiDeviceToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createPublicAiDeviceToken()).not.toBe(token);
  });

  it("only accepts Vercel headers in production and validates the address", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect(
      readPublicAiClientIp(
        new Request("https://example.test", {
          headers: { "x-vercel-forwarded-for": "2001:db8::7" },
        }),
      ),
    ).toBe("2001:db8::7");
    expect(
      readPublicAiClientIp(
        new Request("https://example.test", {
          headers: { "x-vercel-forwarded-for": "203.0.113.7, 10.0.0.1" },
        }),
      ),
    ).toBeNull();

    vi.stubEnv("VERCEL", "");
    expect(
      readPublicAiClientIp(
        new Request("https://example.test", {
          headers: { "x-forwarded-for": "203.0.113.7" },
        }),
      ),
    ).toBeNull();
  });
});

describe("public AI quota RPC parsing", () => {
  it("parses a newly reserved turn", () => {
    expect(
      parsePublicAiQuotaReservation({
        status: "reserved",
        reservation_id: "123e4567-e89b-42d3-a456-426614174000",
        lease_token: "123e4567-e89b-42d3-a456-426614174001",
        lease_expires_at: "2026-08-05T08:10:00.000Z",
        is_new: true,
        limit: PUBLIC_AI_QUOTA_LIMIT,
        remaining: 2,
        resets_at: "2026-08-06T08:00:00.000Z",
      }),
    ).toEqual({
      reservationId: "123e4567-e89b-42d3-a456-426614174000",
      status: "reserved",
      leaseToken: "123e4567-e89b-42d3-a456-426614174001",
      leaseExpiresAt: "2026-08-05T08:10:00.000Z",
      isNew: true,
      limit: 3,
      remaining: 2,
      resetsAt: "2026-08-06T08:00:00.000Z",
    });
  });

  it("turns a quota response into a typed error", () => {
    expect(() =>
      parsePublicAiQuotaReservation({
        status: "quota_exceeded",
        reservation_id: null,
        is_new: false,
        limit: 3,
        remaining: 0,
        resets_at: "2026-08-06T08:00:00.000Z",
      }),
    ).toThrow(PublicAiQuotaExceededError);
  });

  it("rejects malformed leases instead of risking an untracked provider call", () => {
    expect(() =>
      parsePublicAiQuotaReservation({
        status: "reserved",
        reservation_id: "123e4567-e89b-42d3-a456-426614174000",
        lease_token: null,
        lease_expires_at: null,
        is_new: true,
      }),
    ).toThrow(PublicAiQuotaConfigurationError);
  });
});

describe("public AI quota configuration", () => {
  it("requires its own Supabase secret and never falls back to other secrets", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("PUBLIC_AI_QUOTA_SUPABASE_SECRET_KEY", "");
    vi.stubEnv("CODE_RUNNER_SUPABASE_SECRET_KEY", "runner-secret");
    vi.stubEnv("MOCK_HISTORY_SUPABASE_SECRET_KEY", "mock-secret");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "content-sync-secret");

    expect(() => createPublicAiQuotaAdminClient()).toThrow(
      "dedicated Supabase secret key",
    );
  });
});
