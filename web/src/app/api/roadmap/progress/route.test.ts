import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  from: vi.fn(),
  getClaims: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/content/question-store-server", () => ({
  getRepoContentManifest: () => ({
    lessons: [
      { id: "cpp11-toolchain", track: "cpp11" },
      { id: "cpp11-raii", track: "cpp11" },
      { id: "cpp14-generic-lambda", track: "cpp14" },
    ],
  }),
}));

import { DELETE, GET, PUT } from "./route";

const userId = "11111111-1111-4111-8111-111111111111";

describe("/api/roadmap/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          aud: "authenticated",
          sub: userId,
          is_anonymous: false,
        },
      },
      error: null,
    });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getClaims: mocks.getClaims },
      from: mocks.from,
    });
  });

  it("requires a permanent account before reading progress", async () => {
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          aud: "authenticated",
          sub: userId,
          is_anonymous: true,
        },
      },
      error: null,
    });

    const response = await GET(request("/api/roadmap/progress?track=cpp11"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "authentication_required",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns only validated rows for the requested track", async () => {
    const inFilter = vi.fn().mockResolvedValue({
      data: [{ lesson_id: "cpp11-toolchain", status: "learning" }],
      error: null,
    });
    const ownerFilter = vi.fn().mockReturnValue({ in: inFilter });
    const select = vi.fn().mockReturnValue({ eq: ownerFilter });
    mocks.from.mockReturnValue({ select });

    const response = await GET(request("/api/roadmap/progress?track=cpp11"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      states: [{ lessonId: "cpp11-toolchain", status: "learning" }],
    });
    expect(ownerFilter).toHaveBeenCalledWith("user_id", userId);
    expect(inFilter).toHaveBeenCalledWith("lesson_id", [
      "cpp11-toolchain",
      "cpp11-raii",
    ]);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("upserts a validated lesson with the server-derived owner", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert });

    const response = await PUT(
      request("/api/roadmap/progress", {
        method: "PUT",
        body: JSON.stringify({
          track: "cpp11",
          lessonId: "cpp11-raii",
          status: "done",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: userId,
        lesson_id: "cpp11-raii",
        status: "done",
      },
      { onConflict: "user_id,lesson_id" },
    );
  });

  it("rejects a lesson outside the declared track", async () => {
    const response = await PUT(
      request("/api/roadmap/progress", {
        method: "PUT",
        body: JSON.stringify({
          track: "cpp11",
          lessonId: "cpp14-generic-lambda",
          status: "done",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects a client-supplied owner instead of trusting an object reference", async () => {
    const response = await PUT(
      request("/api/roadmap/progress", {
        method: "PUT",
        body: JSON.stringify({
          track: "cpp11",
          lessonId: "cpp11-raii",
          status: "done",
          userId: "22222222-2222-4222-8222-222222222222",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("deletes only the authenticated owner's validated lesson", async () => {
    const lessonFilter = vi.fn().mockResolvedValue({ error: null });
    const ownerFilter = vi.fn().mockReturnValue({ eq: lessonFilter });
    const deleteRows = vi.fn().mockReturnValue({ eq: ownerFilter });
    mocks.from.mockReturnValue({ delete: deleteRows });

    const response = await DELETE(
      request("/api/roadmap/progress", {
        method: "DELETE",
        body: JSON.stringify({ track: "cpp11", lessonId: "cpp11-raii" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(ownerFilter).toHaveBeenCalledWith("user_id", userId);
    expect(lessonFilter).toHaveBeenCalledWith("lesson_id", "cpp11-raii");
  });

  it("rejects cross-origin mutations before touching the session", async () => {
    const response = await PUT(
      request("/api/roadmap/progress", {
        method: "PUT",
        headers: { origin: "https://attacker.example" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });
});

function request(pathname: string, init: RequestInit = {}) {
  return new Request(`https://cppinterview.dev${pathname}`, {
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
}
