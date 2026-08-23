import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { coachGoldenCases } from "./golden-cases";
import {
  coachRowsToAttemptArtifacts,
  readAccountCoachEvidenceArtifacts,
  type AccountEvidenceQuestion,
} from "./account-evidence.server";

const question: AccountEvidenceQuestion = {
  id: "golden-question",
  version: 3,
  sourceRevision: "a".repeat(64),
  responseMode: "text",
  competency: "modern_cpp",
};

describe("account Coach evidence reader", () => {
  it("converts valid rows without retaining the candidate response", () => {
    const converted = coachRowsToAttemptArtifacts(
      [coachRow()],
      [question],
    );

    expect(converted.discardedCount).toBe(0);
    expect(converted.artifacts[0]).toMatchObject({
      question: { id: question.id, current: true },
      response: { status: "not_captured" },
      assessments: [{ key: "modern_cpp", score: 91 }],
    });
    expect(JSON.stringify(converted.artifacts)).not.toContain(
      "candidate_answer",
    );
  });

  it("marks superseded revisions and discards malformed history", () => {
    const converted = coachRowsToAttemptArtifacts(
      [
        coachRow({ question_version: 2 }),
        { ...coachRow({ id: 2 }), feedback: { score: 100 } },
      ],
      [question],
    );

    expect(converted.artifacts).toHaveLength(1);
    expect(converted.artifacts[0].question.current).toBe(false);
    expect(converted.discardedCount).toBe(1);
  });

  it("uses an account-scoped bounded query and never selects raw answers", async () => {
    const calls = {
      table: "",
      selected: "",
      userId: "",
      limit: 0,
    };
    const query = {
      select(columns: string) {
        calls.selected = columns;
        return this;
      },
      eq(column: string, value: string) {
        expect(column).toBe("user_id");
        calls.userId = value;
        return this;
      },
      order() {
        return this;
      },
      async limit(value: number) {
        calls.limit = value;
        return { data: [coachRow()], error: null };
      },
    };
    const supabase = {
      from(table: string) {
        calls.table = table;
        return query;
      },
    } as unknown as SupabaseClient;
    const userId = "123e4567-e89b-42d3-a456-426614174000";

    const result = await readAccountCoachEvidenceArtifacts(supabase, {
      userId,
      questions: [question],
      limit: 1_000,
    });

    expect(result.error).toBeNull();
    expect(calls).toMatchObject({
      table: "coach_attempts",
      userId,
      limit: 500,
    });
    expect(calls.selected).not.toContain("candidate_answer");
  });
});

function coachRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    question_id: question.id,
    question_version: question.version,
    source_commit_sha: question.sourceRevision,
    feedback: coachGoldenCases[0].feedback,
    created_at: "2026-08-22T00:00:00.000Z",
    ...overrides,
  };
}
