import { describe, expect, it } from "vitest";

import {
  mistakeFlashcardDraftSchema,
  normalizeMistakeConcept,
  rowsToMistakeCandidates,
} from "./mistake-cards";

describe("mistake flashcard contracts", () => {
  it("normalizes equivalent criterion wording for dedupe", () => {
    expect(normalizeMistakeConcept("  `const` và  reference! ")).toBe(
      "const và reference",
    );
  });

  it("requires a scaffold for code responses", () => {
    const base = {
      type: "code_reasoning",
      responseMode: "code",
      difficulty: "intermediate",
      estimatedMinutes: 4,
      prompt: "Viết hàm xử lý ownership an toàn trong tình huống này.",
      code: null,
      hint: "Xác định lifetime trước.",
      answer: {
        short: "Dùng ownership rõ ràng và tránh dangling reference.",
        detailed:
          "Thiết kế phải chỉ ra owner, lifetime và cách giải phóng tài nguyên.",
      },
      rubric: {
        required: ["Nêu đúng owner của tài nguyên."],
        bonus: [],
        misconceptions: [],
      },
    };
    expect(mistakeFlashcardDraftSchema.safeParse(base).success).toBe(false);
    expect(
      mistakeFlashcardDraftSchema.safeParse({
        ...base,
        code: "class Solution {\n  // TODO\n};",
      }).success,
    ).toBe(true);
  });

  it("maps DB rows without exposing safe evidence", () => {
    const [candidate] = rowsToMistakeCandidates([
      {
        id: "5a98638a-f506-4ceb-8cff-c1ab2e98af2e",
        source_kind: "coach",
        source_attempt_id: "42",
        source_question_id: "cpp11-auto-001",
        source_question_version: 1,
        source_content_revision: "a".repeat(64),
        lesson_id: "cpp11-auto",
        source_hash: "b".repeat(64),
        source_section_ids: ["rules"],
        criterion_key: "required-1",
        criterion_text: "Explain type deduction",
        competency: null,
        status: "detected",
        occurrence_count: 2,
        attempt_count: 0,
        materialized_question_id: null,
        matched_question_id: null,
        generator_provider: null,
        generator_model: null,
        last_error: { code: "quota" },
        first_seen_at: "2026-07-27T00:00:00Z",
        last_seen_at: "2026-07-27T00:00:00Z",
        created_at: "2026-07-27T00:00:00Z",
        updated_at: "2026-07-27T00:00:00Z",
      },
    ]);
    expect(candidate.occurrenceCount).toBe(2);
    expect(candidate.lastErrorCode).toBe("quota");
    expect(candidate).not.toHaveProperty("safeEvidence");
  });
});
