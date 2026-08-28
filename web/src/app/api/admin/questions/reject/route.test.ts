import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isAdmin: vi.fn(),
  loadOverrides: vi.fn(),
  loadManifest: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/content/question-overrides-server", () => ({
  loadQuestionOverrides: mocks.loadOverrides,
}));
vi.mock("@/lib/content/question-store-server", () => ({
  loadQuestionStoreManifest: mocks.loadManifest,
}));
vi.mock("@/lib/supabase/authorization", () => ({
  isTuanotuanQuestionAdmin: mocks.isAdmin,
}));
vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  }),
}));

import { POST } from "./route";

const sourceHash = "a".repeat(64);
const requestBody = {
  questionId: "cpp11-toolchain-001",
  questionVersion: 1,
  sourceHash,
};
const queuedQuestion = {
  id: requestBody.questionId,
  version: requestBody.questionVersion,
  sourceHash,
  status: "draft",
};

function request(body: unknown = requestBody) {
  return new Request("http://localhost/api/admin/questions/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/questions/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "admin-id" } },
      error: null,
    });
    mocks.isAdmin.mockReturnValue(true);
    mocks.loadOverrides.mockResolvedValue({ overrides: [], error: false });
    mocks.loadManifest.mockResolvedValue({ questions: [queuedQuestion] });
    mocks.rpc.mockResolvedValue({
      data: { status: "rejected", questionId: queuedQuestion.id },
      error: null,
    });
  });

  it("requires the exact application admin identity", async () => {
    mocks.isAdmin.mockReturnValue(false);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects stale client identities before calling the destructive RPC", async () => {
    const response = await POST(
      request({ ...requestBody, questionVersion: 2 }),
    );

    expect(response.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects only queued questions", async () => {
    mocks.loadManifest.mockResolvedValue({
      questions: [{ ...queuedQuestion, status: "verified" }],
    });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("calls the rejection RPC with an exact version and source hash", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "rejected",
      questionId: queuedQuestion.id,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "reject_queued_content_question",
      {
        p_question_id: queuedQuestion.id,
        p_question_version: queuedQuestion.version,
        p_source_hash: queuedQuestion.sourceHash,
      },
    );
  });

  it("does not expose database errors to the client", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "secret database details" },
    });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(JSON.stringify(payload)).not.toContain("secret database details");
  });
});
