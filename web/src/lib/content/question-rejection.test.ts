import { describe, expect, it } from "vitest";

import type { ContentManifest } from "./schema";
import {
  isMissingQuestionRejectionMigration,
  rejectQueuedQuestionSchema,
  withoutRejectedQuestions,
} from "./question-rejection";

const validRequest = {
  questionId: "cpp11-toolchain-001",
  questionVersion: 1,
  sourceHash: "a".repeat(64),
};

describe("queued question rejection", () => {
  it("binds a rejection to a valid question identity", () => {
    expect(rejectQueuedQuestionSchema.parse(validRequest)).toEqual(validRequest);
    expect(
      rejectQueuedQuestionSchema.safeParse({
        ...validRequest,
        questionId: "../toolchain",
      }).success,
    ).toBe(false);
    expect(
      rejectQueuedQuestionSchema.safeParse({
        ...validRequest,
        sourceHash: "not-a-hash",
      }).success,
    ).toBe(false);
  });

  it("removes tombstoned IDs without mutating the source manifest", () => {
    const manifest = {
      schemaVersion: 1,
      sourceRevision: "b".repeat(64),
      lessons: [],
      questions: [
        { id: "cpp11-toolchain-001" },
        { id: "cpp11-toolchain-002" },
      ],
    } as unknown as ContentManifest;

    const filtered = withoutRejectedQuestions(
      manifest,
      new Set(["cpp11-toolchain-001"]),
    );

    expect(filtered.questions.map((question) => question.id)).toEqual([
      "cpp11-toolchain-002",
    ]);
    expect(manifest.questions).toHaveLength(2);
  });

  it("recognizes only rollout-time missing schema errors", () => {
    expect(isMissingQuestionRejectionMigration({ code: "42P01" })).toBe(true);
    expect(isMissingQuestionRejectionMigration({ code: "PGRST202" })).toBe(true);
    expect(isMissingQuestionRejectionMigration({ code: "PGRST205" })).toBe(true);
    expect(isMissingQuestionRejectionMigration({ code: "42703" })).toBe(false);
    expect(isMissingQuestionRejectionMigration({ code: "42501" })).toBe(false);
  });
});
