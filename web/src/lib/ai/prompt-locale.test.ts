import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";

import { buildCoachPrompt, buildCoachSystemInstruction } from "./prompt";

const manifest = contentManifestSchema.parse(manifestJson);
const question = manifest.questions.find(
  (item) => item.id === "cpp20-designated-initializers-001",
)!;
const lesson = manifest.lessons.find(
  (item) => item.id === question.lessonId,
)!;

describe("AI response locale", () => {
  it("gives English a strong output-language contract", () => {
    expect(
      buildCoachSystemInstruction(lesson, "evaluate", "en"),
    ).toContain("every user-facing text field in clear English");
    expect(
      buildCoachPrompt({
        question,
        lesson,
        candidateAnswer: "References preserve identity.",
        responseLocale: "en",
      }),
    ).toContain("every user-facing output field in English");
  });

  it("keeps Vietnamese as the compatibility default", () => {
    expect(buildCoachSystemInstruction(lesson, "evaluate")).toContain(
      "Bạn là người phỏng vấn",
    );
  });
});
