import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  loadManifest: vi.fn(),
  repoManifest: vi.fn(),
  loadTranslations: vi.fn(),
}));

vi.mock("@/lib/mock-interview/history.server", () => ({
  createMockHistoryAdminClient: mocks.createClient,
  MockHistoryConfigurationError:
    class MockHistoryConfigurationError extends Error {},
}));

vi.mock("./question-store-server", () => ({
  getRepoContentManifest: mocks.repoManifest,
  loadQuestionStoreManifest: mocks.loadManifest,
}));

vi.mock("./question-translations.server", () => ({
  loadQuestionTranslationPublications: mocks.loadTranslations,
}));

import { MockHistoryConfigurationError } from "@/lib/mock-interview/history.server";

import { loadPublishedQuestionBank } from "./published-question-bank.server";

const manifest = {
  schemaVersion: 1 as const,
  sourceRevision: "f".repeat(64),
  lessons: [],
  questions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadManifest.mockResolvedValue(manifest);
  mocks.repoManifest.mockReturnValue(manifest);
  mocks.loadTranslations.mockResolvedValue({
    publications: [],
    error: false,
  });
});

describe("published question bank", () => {
  it("reads and deduplicates exact approvals from content admins", async () => {
    const approvalIn = vi.fn().mockResolvedValue({
      data: [
        {
          question_id: "cpp11-card",
          question_version: 2,
          source_hash: "a".repeat(64),
        },
        {
          question_id: "cpp11-card",
          question_version: 2,
          source_hash: "a".repeat(64),
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((relation: string) => {
        if (relation === "content_admins") {
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ user_id: "admin-1" }],
              error: null,
            }),
          };
        }
        if (relation === "question_approvals") {
          return {
            select: vi.fn(() => ({ in: approvalIn })),
          };
        }
        throw new Error(`Unexpected relation: ${relation}`);
      }),
    };
    mocks.createClient.mockReturnValue(client);

    const bank = await loadPublishedQuestionBank("vi");

    expect(bank.publicationAvailable).toBe(true);
    expect(bank.approvals).toEqual([
      {
        questionId: "cpp11-card",
        questionVersion: 2,
        sourceHash: "a".repeat(64),
      },
    ]);
    expect(approvalIn).toHaveBeenCalledWith("user_id", ["admin-1"]);
    expect(mocks.loadManifest).toHaveBeenCalledWith({ supabase: client });
  });

  it("marks the publication unavailable when its server credential is absent", async () => {
    mocks.createClient.mockImplementation(() => {
      throw new MockHistoryConfigurationError();
    });

    const bank = await loadPublishedQuestionBank("vi");

    expect(bank).toMatchObject({
      manifest,
      approvals: [],
      translations: [],
      publicationAvailable: false,
    });
  });
});
