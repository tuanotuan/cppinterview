import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";

import { contentManifestSchema } from "./schema";

describe("C++11 toolchain review drafts", () => {
  const manifest = contentManifestSchema.parse(manifestJson);
  const lesson = manifest.lessons.find(
    (candidate) => candidate.id === "cpp11-toolchain",
  )!;
  const questions = manifest.questions.filter(
    (question) => question.lessonId === lesson.id,
  );

  it("keeps one draft at each supported difficulty", () => {
    expect(
      questions.map((question) => ({
        id: question.id,
        status: question.status,
        difficulty: question.difficulty,
      })),
    ).toEqual([
      {
        id: "cpp11-toolchain-001",
        status: "draft",
        difficulty: "beginner",
      },
      {
        id: "cpp11-toolchain-002",
        status: "draft",
        difficulty: "intermediate",
      },
      {
        id: "cpp11-toolchain-003",
        status: "draft",
        difficulty: "advanced",
      },
    ]);
  });

  it("derives stable C++11 and difficulty tags for filtering", () => {
    for (const question of questions) {
      expect(question.sourceHash).toBe(lesson.sourceHash);
      expect(question.taxonomy.standard).toBe("cpp11");
      expect(question.taxonomy.tags).toContain("standard::cpp11");
      expect(question.taxonomy.tags).toContain(
        `difficulty::${question.difficulty}`,
      );
    }
  });
});
