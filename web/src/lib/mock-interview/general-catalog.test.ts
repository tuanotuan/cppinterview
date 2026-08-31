import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";

import {
  buildGeneralCppInterviewCatalog,
  buildGeneralCppInterviewPlan,
  generalCppQuestionCounts,
  generalCppStandards,
} from "./general-catalog";

const manifest = contentManifestSchema.parse(manifestJson);
const approvals = manifest.questions.map((question) => ({
  questionId: question.id,
  questionVersion: question.version,
  sourceHash: question.sourceHash,
}));
const catalog = buildGeneralCppInterviewCatalog({ manifest, approvals });

describe("general C++ interview catalog", () => {
  it("publishes browser-safe question data without solutions", () => {
    expect(catalog.length).toBeGreaterThan(700);
    expect(new Set(catalog.map((question) => question.standard))).toEqual(
      new Set(generalCppStandards),
    );
    for (const question of catalog) {
      expect(question).not.toHaveProperty("answer");
      expect(question).not.toHaveProperty("hint");
      expect(question).not.toHaveProperty("rubric");
      expect(question).not.toHaveProperty("sources");
    }
  });

  it.each([30, 45, 60] as const)(
    "builds a deterministic %i-minute plan with complete standard coverage",
    (durationMinutes) => {
      const input = {
        catalog,
        catalogRevision: manifest.sourceRevision,
        durationMinutes,
        seed: "00000000-0000-4000-8000-000000000001",
      };
      const first = buildGeneralCppInterviewPlan(input);
      const second = buildGeneralCppInterviewPlan(input);

      expect(second).toEqual(first);
      expect(first.questions).toHaveLength(
        generalCppQuestionCounts[durationMinutes],
      );
      expect(new Set(first.questions.map((question) => question.id)).size).toBe(
        first.questions.length,
      );
      expect(
        new Set(first.questions.map((question) => question.lessonId)).size,
      ).toBe(first.questions.length);
      expect(
        new Set(first.questions.map((question) => question.standard)),
      ).toEqual(new Set(generalCppStandards));
    },
  );

  it("changes the question mix when the session seed changes", () => {
    const first = buildGeneralCppInterviewPlan({
      catalog,
      catalogRevision: manifest.sourceRevision,
      durationMinutes: 45,
      seed: "00000000-0000-4000-8000-000000000001",
    });
    const second = buildGeneralCppInterviewPlan({
      catalog,
      catalogRevision: manifest.sourceRevision,
      durationMinutes: 45,
      seed: "00000000-0000-4000-8000-000000000002",
    });
    expect(second.questions.map((question) => question.id)).not.toEqual(
      first.questions.map((question) => question.id),
    );
  });
});
