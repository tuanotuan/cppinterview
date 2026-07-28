import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";

import { buildCurriculumEvidenceFromManifest } from "./curriculum-evidence";

describe("WorldQuant curriculum manifest evidence", () => {
  it("keeps a verified personal remediation card out of canonical coverage", () => {
    const fullManifest = contentManifestSchema.parse(manifestJson);
    const question = fullManifest.questions.find(
      (item) => item.id === "cpp11-auto-001",
    );
    expect(question?.status).toBe("verified");
    const lesson = fullManifest.lessons.find(
      (item) => item.id === question?.lessonId,
    );
    if (!question || !lesson) {
      throw new Error("Expected verified curriculum fixture");
    }
    const manifest = contentManifestSchema.parse({
      ...fullManifest,
      lessons: [lesson],
      questions: [question],
    });

    const coverage = buildCurriculumEvidenceFromManifest({
      manifest,
      approvals: [],
      mistakeQuestionIds: [question.id],
    });

    expect(
      coverage.concepts.flatMap((item) => item.activeQuestionIds),
    ).not.toContain(question.id);
    expect(
      coverage.concepts.flatMap(
        (item) => item.personalRemediationIds,
      ),
    ).toContain(question.id);
    expect(
      coverage.competencies.modern_cpp.activeQuestionCount,
    ).toBe(0);
    expect(
      coverage.competencies.modern_cpp.pendingQuestionCount,
    ).toBe(0);
  });
});
