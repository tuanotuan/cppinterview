import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";
import { localizeContentManifest } from "@/lib/content/translations";

import {
  buildCoachFollowUpPrompt,
  buildCoachPrompt,
  buildCoachSystemInstruction,
  buildQuestionClarificationPrompt,
} from "./prompt";

const manifest = contentManifestSchema.parse(manifestJson);
const englishManifest = localizeContentManifest(manifest, "en");
const canonicalQuestion = manifest.questions.find(
  (item) => item.id === "cpp11-toolchain-001",
)!;
const question = englishManifest.questions.find(
  (item) => item.id === canonicalQuestion.id,
)!;
const lesson = englishManifest.lessons.find(
  (item) => item.id === question.lessonId,
)!;
const feedback = {
  score: 70,
  verdict: "solid" as const,
  summary: "You identified the main build flag.",
  strengths: ["You separated language mode from warnings."],
  coverage: question.rubric.required.map((criterion) => ({
    criterion,
    status: "met" as const,
    feedback: "Covered in the answer.",
  })),
  corrections: [],
  explanation: "The compiler and linker form the core toolchain.",
  nextStep: "Explain the linking stage too.",
  followUpQuestion: "Why should CI pin the compiler version?",
  suggestedRating: "good" as const,
  sourceSectionIds: question.sources.map(({ sectionId }) => sectionId),
};

describe("AI response locale", () => {
  it("grounds every Coach mode in English content and output contracts", () => {
    expect(question.prompt).not.toBe(canonicalQuestion.prompt);
    expect(question.prompt).toContain("toolchain");
    expect(lesson.title).toContain("Toolchain");
    expect(
      buildCoachSystemInstruction(lesson, "evaluate", "en"),
    ).toContain("every user-facing text field in clear English");
    const evaluationPrompt = buildCoachPrompt({
      question,
      lesson,
      candidateAnswer: "The toolchain compiles and links the program.",
      responseLocale: "en",
    });
    const followUpPrompt = buildCoachFollowUpPrompt({
      question,
      lesson,
      candidateAnswer: "The toolchain compiles and links the program.",
      feedback,
      messages: [{ role: "user", content: "Why is `-Wall` different?" }],
      responseLocale: "en",
    });
    const clarificationPrompt = buildQuestionClarificationPrompt({
      question,
      lesson,
      responseLocale: "en",
    });

    for (const prompt of [
      evaluationPrompt,
      followUpPrompt,
      clarificationPrompt,
    ]) {
      expect(prompt).toContain("every user-facing output field in English");
      expect(prompt).toContain(question.prompt);
      expect(prompt).toContain("never mirror Vietnamese prose");
    }
    expect(evaluationPrompt).toContain(question.rubric.required[0]);
  });

  it("keeps Vietnamese as the compatibility default", () => {
    expect(buildCoachSystemInstruction(lesson, "evaluate")).toContain(
      "Bạn là người phỏng vấn",
    );
  });
});
