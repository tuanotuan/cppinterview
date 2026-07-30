import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/coach/evaluate", () => {
  it("fails closed before calling a provider when Supabase is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("ALLOW_UNMETERED_LOCAL_AI", "false");

    const response = await POST(
      new Request("http://localhost/api/coach/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": crypto.randomUUID(),
        },
        body: JSON.stringify({
          questionId: "cpp11-auto-001",
          answer: "Một câu trả lời hợp lệ nhưng không được gửi tới AI.",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "service_not_configured",
    });
  });
});
