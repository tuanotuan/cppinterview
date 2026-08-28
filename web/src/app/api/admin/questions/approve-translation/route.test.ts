import { beforeEach, describe, expect, it, vi } from "vitest";

const hash = "a".repeat(64);
const approval = {
  questionId: "cpp11-toolchain-001",
  questionVersion: 1,
  sourceHash: hash,
  locale: "en" as const,
};
const question = {
  id: approval.questionId,
  version: approval.questionVersion,
  sourceHash: approval.sourceHash,
  status: "draft",
};
const translation = {
  ...approval,
  status: "draft" as const,
  prompt: "What does a C++ toolchain do during a build?",
  hint: "Separate compilation from linking.",
  answer: {
    short: "It compiles source and links objects into a program.",
    detailed:
      "The compiler translates source into object code, and the linker resolves symbols into the executable.",
  },
  rubric: {
    required: ["Names compilation and linking"],
    bonus: [],
    misconceptions: [],
  },
};

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  findExactQuestionTranslation: vi.fn(),
  isAdmin: vi.fn(),
  isConfigured: vi.fn(),
  loadQuestionOverrides: vi.fn(),
  loadQuestionStoreManifest: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/content/question-overrides-server", () => ({
  loadQuestionOverrides: mocks.loadQuestionOverrides,
}));
vi.mock("@/lib/content/question-store-server", () => ({
  loadQuestionStoreManifest: mocks.loadQuestionStoreManifest,
}));
vi.mock("@/lib/content/translations", () => ({
  findExactQuestionTranslation: mocks.findExactQuestionTranslation,
}));
vi.mock("@/lib/supabase/authorization", () => ({
  isTuanotuanQuestionAdmin: mocks.isAdmin,
}));
vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isConfigured,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { POST } from "./route";

const userId = "1bb81120-9434-4e39-89ad-d0580e768c7c";
const supabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isConfigured.mockReturnValue(true);
  mocks.isAdmin.mockReturnValue(true);
  mocks.loadQuestionOverrides.mockResolvedValue({ overrides: [], error: null });
  mocks.loadQuestionStoreManifest.mockResolvedValue({ questions: [question] });
  mocks.findExactQuestionTranslation.mockReturnValue(translation);
  mocks.upsert.mockResolvedValue({ error: null });
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  supabase.from.mockReturnValue({ upsert: mocks.upsert });
  mocks.createSupabaseServerClient.mockResolvedValue(supabase);
});

describe("POST /api/admin/questions/approve-translation", () => {
  it("requires the exact question-bank administrator", async () => {
    mocks.isAdmin.mockReturnValue(false);

    const response = await sendRequest();

    expect(response.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("rejects duplicate or malformed translation identities", async () => {
    const response = await sendRequest({ translations: [approval, approval] });

    expect(response.status).toBe(400);
    expect(mocks.loadQuestionStoreManifest).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("rejects an approval after the canonical revision changes", async () => {
    mocks.loadQuestionStoreManifest.mockResolvedValue({
      questions: [{ ...question, sourceHash: "b".repeat(64) }],
    });

    const response = await sendRequest();

    expect(response.status).toBe(409);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("upserts only trusted server-side English copy for the exact revision", async () => {
    const response = await sendRequest({
      translations: [{ ...approval, prompt: "untrusted browser copy" }],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ approved: [approval] });
    expect(mocks.findExactQuestionTranslation).toHaveBeenCalledWith(
      question,
      "en",
    );
    expect(mocks.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          question_id: approval.questionId,
          question_version: approval.questionVersion,
          source_hash: approval.sourceHash,
          locale: "en",
          prompt: translation.prompt,
          translation_status: "verified",
          approved_by: userId,
          approved_at: expect.any(String),
        }),
      ],
      { onConflict: "question_id,question_version,locale" },
    );
  });
});

function sendRequest(body: unknown = { translations: [approval] }) {
  return POST(
    new Request("http://localhost/api/admin/questions/approve-translation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
