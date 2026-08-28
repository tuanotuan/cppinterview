import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";

import { currentQuestionSourceSections } from "./question-source-sections";
import { contentManifestSchema } from "./schema";

describe("currentQuestionSourceSections", () => {
  const manifest = contentManifestSchema.parse(manifestJson);
  const lesson = manifest.lessons.find(
    (candidate) => candidate.id === "cpp11-toolchain",
  )!;
  const question = manifest.questions.find(
    (candidate) => candidate.id === "cpp11-toolchain-001",
  )!;

  it("resolves citations from the current lesson revision", () => {
    expect(currentQuestionSourceSections(question, lesson)).toEqual(
      question.sources.map(({ sectionId }) => {
        const section = lesson.sections.find((item) => item.id === sectionId)!;
        return {
          id: section.id,
          heading: section.heading,
          excerpt: section.bodyText.slice(0, 900),
        };
      }),
    );
  });

  it("does not dereference stale DB question citations against a new lesson revision", () => {
    expect(
      currentQuestionSourceSections(
        {
          ...question,
          sourceHash: "0".repeat(64),
          sources: [{ sectionId: "problem-it-solves" }],
        },
        lesson,
      ),
    ).toEqual([]);
  });

  it("still rejects a missing section on the current revision", () => {
    expect(() =>
      currentQuestionSourceSections(
        {
          ...question,
          sources: [{ sectionId: "missing-current-section" }],
        },
        lesson,
      ),
    ).toThrow("Missing section cpp11-toolchain#missing-current-section");
  });
});
