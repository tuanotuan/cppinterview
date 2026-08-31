import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";

import { contentManifestSchema } from "./schema";
import { questionTranslationReviewCandidates } from "./translations";

describe("C++11 53-day curriculum", () => {
  const manifest = contentManifestSchema.parse(manifestJson);
  const lessons = manifest.lessons
    .filter((lesson) => lesson.track === "cpp11")
    .sort((left, right) => left.order - right.order);

  it("loads all 53 bilingual lessons with the same source shape", () => {
    expect(lessons).toHaveLength(53);
    expect(lessons.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 53 }, (_, index) => index + 1),
    );
    for (const lesson of lessons) {
      expect(lesson.knowledgePath).toBe(`${lesson.sourcePath}/vi.md`);
      expect(lesson.translationPaths).toEqual([`${lesson.sourcePath}/en.md`]);
      expect(lesson.codePath).toBe(`${lesson.sourcePath}/main.cpp`);
      expect(lesson.sections).toHaveLength(10);
      expect(lesson.code).not.toBeNull();
    }
  });

  it("keeps only vi.md, en.md, and main.cpp in every lesson directory", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    for (const lesson of lessons) {
      const files = await readdir(path.join(repoRoot, lesson.sourcePath));
      expect(files.sort()).toEqual(["en.md", "main.cpp", "vi.md"]);
    }
  });

  it("keeps three canonical drafts per lesson with stable filter tags", () => {
    for (const lesson of lessons) {
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));
      expect(
        questions.map((question) => ({
          id: question.id,
          status: question.status,
          difficulty: question.difficulty,
        })),
      ).toEqual([
        {
          id: `${lesson.id}-001`,
          status: "draft",
          difficulty: "beginner",
        },
        {
          id: `${lesson.id}-002`,
          status: "draft",
          difficulty: "intermediate",
        },
        {
          id: `${lesson.id}-003`,
          status: "draft",
          difficulty: "advanced",
        },
      ]);
      for (const question of questions) {
        expect(question.sourceHash).toBe(lesson.sourceHash);
        expect(question.taxonomy.standard).toBe("cpp11");
        expect(question.taxonomy.tags).toContain("standard::cpp11");
        expect(question.taxonomy.tags).toContain(
          `difficulty::${question.difficulty}`,
        );
      }
    }
  });

  it("does not retain the superseded day-2 interview draft", () => {
    expect(
      manifest.questions.some(
        (question) =>
          question.id ===
          "cpp11-const-pointer-lvalue-reference-interview-ownership-001",
      ),
    ).toBe(false);
  });

  it("copies the six self-check prompts from each day 2-53 source pair", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    const englishReviews = new Map(
      questionTranslationReviewCandidates(manifest, "en").map((review) => [
        review.question.id,
        review.question.prompt,
      ]),
    );

    for (const lesson of lessons.filter((candidate) => candidate.order >= 2)) {
      const translationPath = lesson.translationPaths![0]!;
      const [vietnameseMarkdown, englishMarkdown] = await Promise.all([
        readFile(path.join(repoRoot, lesson.knowledgePath), "utf8"),
        readFile(path.join(repoRoot, translationPath), "utf8"),
      ]);
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));

      expect(questions.map((question) => question.prompt)).toEqual(
        selfCheckPrompts(vietnameseMarkdown, /^(?:Dễ|Trung bình|Khó)$/u),
      );
      expect(questions.map((question) => englishReviews.get(question.id))).toEqual(
        selfCheckPrompts(englishMarkdown, /^(?:Easy|Medium|Hard)$/u),
      );
    }
  });
});

describe("C++14 50-day curriculum", () => {
  const manifest = contentManifestSchema.parse(manifestJson);
  const lessons = manifest.lessons
    .filter((lesson) => lesson.track === "cpp14")
    .sort((left, right) => left.order - right.order);

  it("loads all 50 bilingual lessons with the same source shape", () => {
    expect(lessons).toHaveLength(50);
    expect(lessons.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
    for (const [index, lesson] of lessons.entries()) {
      expect(lesson.knowledgePath).toBe(`${lesson.sourcePath}/vi.md`);
      expect(lesson.translationPaths).toEqual([`${lesson.sourcePath}/en.md`]);
      expect(lesson.codePath).toBe(`${lesson.sourcePath}/main.cpp`);
      expect(lesson.sections).toHaveLength(10);
      expect(lesson.code).not.toBeNull();
      expect(lesson.prerequisites).toEqual(
        index === 0 ? [] : [lessons[index - 1]!.id],
      );
    }
  });

  it("keeps only vi.md, en.md, and main.cpp in every lesson directory", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    for (const lesson of lessons) {
      const files = await readdir(path.join(repoRoot, lesson.sourcePath));
      expect(files.sort()).toEqual(["en.md", "main.cpp", "vi.md"]);
    }
  });

  it("keeps three canonical drafts per lesson with C++14 and difficulty tags", () => {
    for (const lesson of lessons) {
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));
      expect(
        questions.map((question) => ({
          id: question.id,
          status: question.status,
          difficulty: question.difficulty,
        })),
      ).toEqual([
        {
          id: `${lesson.id}-001`,
          status: "draft",
          difficulty: "beginner",
        },
        {
          id: `${lesson.id}-002`,
          status: "draft",
          difficulty: "intermediate",
        },
        {
          id: `${lesson.id}-003`,
          status: "draft",
          difficulty: "advanced",
        },
      ]);
      for (const question of questions) {
        expect(question.sourceHash).toBe(lesson.sourceHash);
        expect(question.taxonomy.standard).toBe("cpp14");
        expect(question.taxonomy.tags).toContain("standard::cpp14");
        expect(question.taxonomy.tags).toContain(
          `difficulty::${question.difficulty}`,
        );
      }
    }
  });

  it("copies all six self-check prompts into the two review queues", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    const englishReviews = new Map(
      questionTranslationReviewCandidates(manifest, "en")
        .filter((review) => review.question.lessonId.startsWith("cpp14-"))
        .map((review) => [review.question.id, review.question.prompt]),
    );

    expect(englishReviews.size).toBe(150);
    for (const lesson of lessons) {
      const [vietnameseMarkdown, englishMarkdown] = await Promise.all([
        readFile(path.join(repoRoot, lesson.knowledgePath), "utf8"),
        readFile(path.join(repoRoot, lesson.translationPaths![0]!), "utf8"),
      ]);
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));

      expect(questions.map((question) => question.prompt)).toEqual(
        selfCheckPrompts(vietnameseMarkdown, /^(?:Dễ|Trung bình|Khó)$/u),
      );
      expect(questions.map((question) => englishReviews.get(question.id))).toEqual(
        selfCheckPrompts(englishMarkdown, /^(?:Easy|Medium|Hard)$/u),
      );
    }
  });
});

describe("C++17 50-day curriculum", () => {
  const manifest = contentManifestSchema.parse(manifestJson);
  const lessons = manifest.lessons
    .filter((lesson) => lesson.track === "cpp17")
    .sort((left, right) => left.order - right.order);

  it("loads all 50 bilingual lessons with the same source shape", () => {
    expect(lessons).toHaveLength(50);
    expect(lessons.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
    for (const [index, lesson] of lessons.entries()) {
      expect(lesson.knowledgePath).toBe(`${lesson.sourcePath}/vi.md`);
      expect(lesson.translationPaths).toEqual([`${lesson.sourcePath}/en.md`]);
      expect(lesson.codePath).toBe(`${lesson.sourcePath}/main.cpp`);
      expect(lesson.sections).toHaveLength(10);
      expect(lesson.code).not.toBeNull();
      expect(lesson.prerequisites).toEqual(
        index === 0 ? [] : [lessons[index - 1]!.id],
      );
    }
  });

  it("keeps only vi.md, en.md, and main.cpp in every lesson directory", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    for (const lesson of lessons) {
      const files = await readdir(path.join(repoRoot, lesson.sourcePath));
      expect(files.sort()).toEqual(["en.md", "main.cpp", "vi.md"]);
    }
  });

  it("keeps three canonical drafts per lesson with C++17 and difficulty tags", () => {
    for (const lesson of lessons) {
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));
      expect(
        questions.map((question) => ({
          id: question.id,
          status: question.status,
          difficulty: question.difficulty,
        })),
      ).toEqual([
        {
          id: `${lesson.id}-001`,
          status: "draft",
          difficulty: "beginner",
        },
        {
          id: `${lesson.id}-002`,
          status: "draft",
          difficulty: "intermediate",
        },
        {
          id: `${lesson.id}-003`,
          status: "draft",
          difficulty: "advanced",
        },
      ]);
      for (const question of questions) {
        expect(question.sourceHash).toBe(lesson.sourceHash);
        expect(question.taxonomy.standard).toBe("cpp17");
        expect(question.taxonomy.tags).toContain("standard::cpp17");
        expect(question.taxonomy.tags).toContain(
          `difficulty::${question.difficulty}`,
        );
      }
    }
  });

  it("copies all six self-check prompts into the two review queues", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    const englishReviews = new Map(
      questionTranslationReviewCandidates(manifest, "en")
        .filter((review) => review.question.lessonId.startsWith("cpp17-"))
        .map((review) => [review.question.id, review.question.prompt]),
    );

    expect(englishReviews.size).toBe(150);
    for (const lesson of lessons) {
      const [vietnameseMarkdown, englishMarkdown] = await Promise.all([
        readFile(path.join(repoRoot, lesson.knowledgePath), "utf8"),
        readFile(path.join(repoRoot, lesson.translationPaths![0]!), "utf8"),
      ]);
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));

      expect(questions.map((question) => question.prompt)).toEqual(
        selfCheckPrompts(vietnameseMarkdown, /^(?:Dễ|Trung bình|Khó)$/u),
      );
      expect(questions.map((question) => englishReviews.get(question.id))).toEqual(
        selfCheckPrompts(englishMarkdown, /^(?:Easy|Medium|Hard)$/u),
      );
    }
  });
});

describe("C++20 52-day curriculum", () => {
  const manifest = contentManifestSchema.parse(manifestJson);
  const lessons = manifest.lessons
    .filter((lesson) => lesson.track === "cpp20")
    .sort((left, right) => left.order - right.order);

  it("loads all 52 bilingual lessons with the same source shape", () => {
    expect(lessons).toHaveLength(52);
    expect(lessons.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 52 }, (_, index) => index + 1),
    );
    for (const [index, lesson] of lessons.entries()) {
      expect(lesson.knowledgePath).toBe(`${lesson.sourcePath}/vi.md`);
      expect(lesson.translationPaths).toEqual([`${lesson.sourcePath}/en.md`]);
      expect(lesson.codePath).toBe(`${lesson.sourcePath}/main.cpp`);
      expect(lesson.sections).toHaveLength(10);
      expect(lesson.code).not.toBeNull();
      expect(lesson.prerequisites).toEqual(
        index === 0 ? [] : [lessons[index - 1]!.id],
      );
    }
  });

  it("keeps only vi.md, en.md, and main.cpp in every lesson directory", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    for (const lesson of lessons) {
      const files = await readdir(path.join(repoRoot, lesson.sourcePath));
      expect(files.sort()).toEqual(["en.md", "main.cpp", "vi.md"]);
    }
  });

  it("keeps three canonical drafts per lesson with C++20 and difficulty tags", () => {
    for (const lesson of lessons) {
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));
      expect(
        questions.map((question) => ({
          id: question.id,
          status: question.status,
          difficulty: question.difficulty,
        })),
      ).toEqual([
        {
          id: `${lesson.id}-001`,
          status: "draft",
          difficulty: "beginner",
        },
        {
          id: `${lesson.id}-002`,
          status: "draft",
          difficulty: "intermediate",
        },
        {
          id: `${lesson.id}-003`,
          status: "draft",
          difficulty: "advanced",
        },
      ]);
      for (const question of questions) {
        expect(question.sourceHash).toBe(lesson.sourceHash);
        expect(question.taxonomy.standard).toBe("cpp20");
        expect(question.taxonomy.tags).toContain("standard::cpp20");
        expect(question.taxonomy.tags).toContain(
          `difficulty::${question.difficulty}`,
        );
      }
    }
  });

  it("copies all six self-check prompts into the two review queues", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    const englishReviews = new Map(
      questionTranslationReviewCandidates(manifest, "en")
        .filter((review) => review.question.lessonId.startsWith("cpp20-"))
        .map((review) => [review.question.id, review.question.prompt]),
    );

    expect(englishReviews.size).toBe(156);
    for (const lesson of lessons) {
      const [vietnameseMarkdown, englishMarkdown] = await Promise.all([
        readFile(path.join(repoRoot, lesson.knowledgePath), "utf8"),
        readFile(path.join(repoRoot, lesson.translationPaths![0]!), "utf8"),
      ]);
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));

      expect(questions.map((question) => question.prompt)).toEqual(
        selfCheckPrompts(vietnameseMarkdown, /^(?:Dễ|Trung bình|Khó)$/u),
      );
      expect(questions.map((question) => englishReviews.get(question.id))).toEqual(
        selfCheckPrompts(englishMarkdown, /^(?:Easy|Medium|Hard)$/u),
      );
    }
  });

  it("removes the superseded designated-initializer lesson and question", () => {
    expect(
      manifest.lessons.some(
        (lesson) => lesson.id === "cpp20-designated-initializers",
      ),
    ).toBe(false);
    expect(
      manifest.questions.some(
        (question) => question.id === "cpp20-designated-initializers-001",
      ),
    ).toBe(false);
  });
});

describe("C++23 54-day curriculum", () => {
  const manifest = contentManifestSchema.parse(manifestJson);
  const lessons = manifest.lessons
    .filter((lesson) => lesson.track === "cpp23")
    .sort((left, right) => left.order - right.order);

  it("loads all 54 bilingual lessons with the same source shape", () => {
    expect(lessons).toHaveLength(54);
    expect(lessons.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 54 }, (_, index) => index + 1),
    );
    for (const [index, lesson] of lessons.entries()) {
      expect(lesson.knowledgePath).toBe(`${lesson.sourcePath}/vi.md`);
      expect(lesson.translationPaths).toEqual([`${lesson.sourcePath}/en.md`]);
      expect(lesson.codePath).toBe(`${lesson.sourcePath}/main.cpp`);
      expect(lesson.sections).toHaveLength(10);
      expect(lesson.code).not.toBeNull();
      expect(lesson.prerequisites).toEqual(
        index === 0 ? [] : [lessons[index - 1]!.id],
      );
    }
  });

  it("keeps only vi.md, en.md, and main.cpp in every lesson directory", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    for (const lesson of lessons) {
      const files = await readdir(path.join(repoRoot, lesson.sourcePath));
      expect(files.sort()).toEqual(["en.md", "main.cpp", "vi.md"]);
    }
  });

  it("keeps three canonical drafts per lesson with C++23 and difficulty tags", () => {
    for (const lesson of lessons) {
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));
      expect(
        questions.map((question) => ({
          id: question.id,
          status: question.status,
          difficulty: question.difficulty,
        })),
      ).toEqual([
        {
          id: `${lesson.id}-001`,
          status: "draft",
          difficulty: "beginner",
        },
        {
          id: `${lesson.id}-002`,
          status: "draft",
          difficulty: "intermediate",
        },
        {
          id: `${lesson.id}-003`,
          status: "draft",
          difficulty: "advanced",
        },
      ]);
      expect(normalizeCode(questions[1]!.code)).toBe(normalizeCode(lesson.code));
      for (const question of questions) {
        expect(question.sourceHash).toBe(lesson.sourceHash);
        expect(question.taxonomy.standard).toBe("cpp23");
        expect(question.taxonomy.tags).toContain("standard::cpp23");
        expect(question.taxonomy.tags).toContain(
          `difficulty::${question.difficulty}`,
        );
      }
    }
  });

  it("copies all six self-check prompts into the two review queues", async () => {
    const repoRoot = path.resolve(process.cwd(), "..");
    const englishReviews = new Map(
      questionTranslationReviewCandidates(manifest, "en")
        .filter((review) => review.question.lessonId.startsWith("cpp23-"))
        .map((review) => [review.question.id, review.question.prompt]),
    );

    expect(englishReviews.size).toBe(162);
    for (const lesson of lessons) {
      const [vietnameseMarkdown, englishMarkdown] = await Promise.all([
        readFile(path.join(repoRoot, lesson.knowledgePath), "utf8"),
        readFile(path.join(repoRoot, lesson.translationPaths![0]!), "utf8"),
      ]);
      const questions = manifest.questions
        .filter((question) => question.lessonId === lesson.id)
        .sort((left, right) => left.id.localeCompare(right.id));

      expect(questions.map((question) => question.prompt)).toEqual(
        selfCheckPrompts(vietnameseMarkdown, /^(?:Dễ|Trung bình|Khó)$/u),
      );
      expect(questions.map((question) => englishReviews.get(question.id))).toEqual(
        selfCheckPrompts(englishMarkdown, /^(?:Easy|Medium|Hard)$/u),
      );
    }
  });
});

function selfCheckPrompts(markdown: string, difficulty: RegExp) {
  return markdown
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .flatMap((line) => {
      const match = /^\d+\. ([^—]+) — (.+)$/u.exec(line.trim());
      return match && difficulty.test(match[1]!.trim()) ? [match[2]!.trim()] : [];
    });
}

function normalizeCode(code: string | null | undefined) {
  return code?.replace(/\r\n?/gu, "\n").trimEnd();
}
