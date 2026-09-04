import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import englishCatalog from "@/content-translations/en.json";
import manifestJson from "@/generated/content-manifest.json";

import { contentManifestSchema } from "./schema";

type SourceQuestion = {
  number: number;
  sourceId: string;
  directory: string;
  chapter: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionVersion?: number;
  prompt: { en: string; vi: string };
  repeatOf?: string;
};

const repoRoot = path.resolve(process.cwd(), "..");
const sourceCatalog = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "content", "daily-cpp-interview-source.json"),
    "utf8",
  ),
) as {
  collection: {
    id: string;
    track: string;
    title: string;
    questionCount: number;
    uniquePromptCount: number;
    defaultQuestionVersion: number;
  };
  questions: SourceQuestion[];
};
const manifest = contentManifestSchema.parse(manifestJson);
const lessons = manifest.lessons
  .filter((lesson) => lesson.track === "dailycpp")
  .sort((left, right) => left.order - right.order);
const codeDependentQuestionNumbers = new Set([
  4, 19, 28, 32, 113, 115, 126, 127, 129, 130, 133,
]);
const mojibakePattern =
  /(?:\u00c3|\u00c2|\u00c6|\u00c4|\u00e1[\u00ba\u00bb]|\u00e2(?:\u0080|\u20ac)|\ufffd)/u;

describe("Real-World C++ Interviews collection", () => {
  it("preserves the source inventory and intentional repetitions", () => {
    expect(sourceCatalog.collection).toMatchObject({
      id: "daily-cpp-interview",
      track: "dailycpp",
      title: "Real-World C++ Interviews",
      questionCount: 146,
      uniquePromptCount: 127,
      defaultQuestionVersion: 1,
    });
    expect(sourceCatalog.questions).toHaveLength(146);
    expect(sourceCatalog.questions.map((question) => question.number)).toEqual(
      Array.from({ length: 146 }, (_, index) => index + 1),
    );

    const promptGroups = new Map<string, number[]>();
    for (const question of sourceCatalog.questions) {
      const key = question.prompt.en.trim().toLowerCase();
      promptGroups.set(key, [...(promptGroups.get(key) ?? []), question.number]);
    }
    expect(promptGroups.size).toBe(127);
    expect(
      [...promptGroups.values()].filter((numbers) => numbers.length === 2),
    ).toHaveLength(19);
    expect(
      sourceCatalog.questions.filter((question) => question.repeatOf),
    ).toHaveLength(19);
    for (const question of sourceCatalog.questions) {
      expect(mojibakePattern.test(question.prompt.vi)).toBe(false);
      expect(mojibakePattern.test(question.prompt.en)).toBe(false);
      if (question.repeatOf) {
        const original = sourceCatalog.questions.find(
          (candidate) => candidate.sourceId === question.repeatOf,
        );
        expect(original?.prompt).toEqual(question.prompt);
        expect(original?.difficulty).toBe(question.difficulty);
      }
    }
  });

  it("loads 146 sequential bilingual lessons without a roadmap", () => {
    expect(lessons).toHaveLength(146);
    expect(lessons.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 146 }, (_, index) => index + 1),
    );
    expect(
      existsSync(path.join(process.cwd(), "content", "roadmaps", "dailycpp.yaml")),
    ).toBe(false);

    for (const [index, lesson] of lessons.entries()) {
      const source = sourceCatalog.questions[index]!;
      expect(lesson.id).toBe(
        `dailycpp-q${String(source.number).padStart(3, "0")}`,
      );
      expect(lesson.sourcePath).toBe(
        `dailycppinterview/${source.directory}`,
      );
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

  it("keeps exactly vi.md, en.md, and main.cpp in every topic", async () => {
    for (const lesson of lessons) {
      const files = await readdir(path.join(repoRoot, lesson.sourcePath));
      expect(files.sort()).toEqual(["en.md", "main.cpp", "vi.md"]);
    }
  });

  it("keeps exactly one source question per lesson", async () => {
    const englishQuestions = new Map(
      englishCatalog.questions
        .filter((question) => question.questionId.startsWith("dailycpp-q"))
        .map((question) => [question.questionId, question]),
    );
    expect(englishQuestions.size).toBe(146);

    for (const [index, lesson] of lessons.entries()) {
      const source = sourceCatalog.questions[index]!;
      const questions = manifest.questions.filter(
        (question) => question.lessonId === lesson.id,
      );
      expect(questions).toHaveLength(1);

      const question = questions[0]!;
      const expectedVersion = source.questionVersion ??
        sourceCatalog.collection.defaultQuestionVersion;
      expect(question).toMatchObject({
        id: `${lesson.id}-001`,
        status: "draft",
        difficulty: source.difficulty,
        prompt: source.prompt.vi,
        sourceHash: lesson.sourceHash,
        version: expectedVersion,
      });
      expect(question.taxonomy.standard).toBe("dailycpp");
      expect(question.taxonomy.tags).toContain("standard::dailycpp");
      expect(question.taxonomy.tags).toContain(
        `difficulty::${source.difficulty}`,
      );
      if (codeDependentQuestionNumbers.has(source.number)) {
        expect(question.code).toBeTruthy();
        expect(question.type).toBe("code_reasoning");
      }

      const english = englishQuestions.get(question.id);
      expect(english).toMatchObject({
        questionId: question.id,
        questionVersion: expectedVersion,
        sourceHash: lesson.sourceHash,
        status: "draft",
        prompt: source.prompt.en,
      });

      const [viMarkdown, enMarkdown] = await Promise.all([
        readFile(path.join(repoRoot, lesson.knowledgePath), "utf8"),
        readFile(path.join(repoRoot, lesson.translationPaths![0]!), "utf8"),
      ]);
      expect(viMarkdown).toContain("bộ Daily C++ Interview");
      expect(enMarkdown).toContain("Daily C++ Interview collection");
      expect(selfCheckPrompt(viMarkdown)).toBe(source.prompt.vi);
      expect(selfCheckPrompt(enMarkdown)).toBe(source.prompt.en);
      expect(selfCheckCount(viMarkdown)).toBe(1);
      expect(selfCheckCount(enMarkdown)).toBe(1);
      expect(mojibakePattern.test(viMarkdown)).toBe(false);
      expect(mojibakePattern.test(enMarkdown)).toBe(false);
    }
  });
});

function selfCheckCount(markdown: string) {
  return markdown
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .filter((line) =>
      /^1\. (?:Dễ|Trung bình|Khó|Easy|Medium|Hard) — /u.test(line.trim()),
    ).length;
}

function selfCheckPrompt(markdown: string) {
  const line = markdown
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .find((candidate) =>
      /^1\. (?:Dễ|Trung bình|Khó|Easy|Medium|Hard) — /u.test(candidate.trim()),
    );
  if (!line) {
    throw new Error("Missing single Real-World C++ Interviews self-check");
  }
  return line
    .trim()
    .replace(/^1\. (?:Dễ|Trung bình|Khó|Easy|Medium|Hard) — /u, "")
    .replace(/\\([<>])/gu, "$1");
}
