import { describe, expect, it } from "vitest";

import repositoryManifestJson from "@/generated/content-manifest.json";

import type { ContentManifest } from "../content/schema";
import { contentManifestSchema } from "../content/schema";

import { buildAdminDashboardSnapshot } from "./dashboard";

const hash = "a".repeat(64);

const manifest: ContentManifest = {
  schemaVersion: 1,
  sourceRevision: "b".repeat(64),
  lessons: [
    {
      id: "cpp11-example",
      sourcePath: "cpp11/example",
      language: "cpp",
      track: "cpp11",
      standard: "cpp11",
      order: 1,
      tags: ["example"],
      prerequisites: [],
      title: "Example",
      knowledgePath: "cpp11/example/knowledge.md",
      codePath: null,
      sourceHash: hash,
      sections: [
        { id: "overview", heading: "Overview", bodyMarkdown: "body", bodyText: "body" },
      ],
      checklistItems: [],
      code: null,
    },
    {
      id: "cpp20-empty",
      sourcePath: "cpp20/empty",
      language: "cpp",
      track: "cpp20",
      standard: "cpp20",
      order: 1,
      tags: ["empty"],
      prerequisites: [],
      title: "Empty",
      knowledgePath: "cpp20/empty/knowledge.md",
      codePath: null,
      sourceHash: "c".repeat(64),
      sections: [
        { id: "overview", heading: "Overview", bodyMarkdown: "body", bodyText: "body" },
      ],
      checklistItems: [],
      code: null,
    },
  ],
  questions: [
    {
      id: "cpp11-example-001",
      lessonId: "cpp11-example",
      type: "recall",
      difficulty: "beginner",
      estimatedMinutes: 3,
      prompt: "Explain the example in enough detail.",
      hint: "Think about the overview section.",
      answer: { short: "A sufficiently long short answer.", detailed: "A detailed answer long enough for validation." },
      rubric: { required: ["Explain the core example"], bonus: [], misconceptions: [] },
      sources: [{ sectionId: "overview" }],
      sourceHash: hash,
      status: "draft",
      version: 1,
      taxonomy: {
        deckId: "cpp-interview",
        standard: "cpp11",
        topics: ["example"],
        skill: "recall",
        difficulty: "beginner",
        responseMode: "text",
        sourceLessonId: "cpp11-example",
        tags: [
          "deck::cpp-interview",
          "standard::cpp11",
          "topic::example",
          "skill::recall",
          "difficulty::beginner",
          "response::text",
          "source::cpp11-example",
        ],
      },
    },
  ],
};

describe("admin dashboard snapshot", () => {
  it("counts approved drafts as active and reports uncovered lessons", () => {
    const snapshot = buildAdminDashboardSnapshot(
      manifest,
      [{ questionId: "cpp11-example-001", questionVersion: 1, sourceHash: hash }],
      {
        version: 1,
        reviews: [
          {
            questionId: "cpp11-example-001",
            reviewedOn: "2026-07-19",
            rating: "hard",
            nextDueOn: "2026-07-20",
          },
        ],
      },
      [],
      "2026-07-20",
    );

    expect(snapshot.metrics).toMatchObject({
      lessons: 2,
      questions: 1,
      activeQuestions: 1,
      pendingQuestions: 0,
      uncoveredLessons: 1,
      dueQuestions: 1,
    });
    expect(snapshot.questions[0].adminStatus).toBe("active");
    expect(snapshot.questions[0].learning).toMatchObject({
      state: "review",
      dueOn: "2026-07-20",
    });
    expect(snapshot.questions[0].reviewHistory).toHaveLength(1);
    expect(snapshot.ratingCounts.hard).toBe(1);
    expect(snapshot.lessons[0].sourceSections).toEqual([
      { id: "overview", heading: "Overview" },
    ]);
  });

  it("lists Toolchain English copy as three independent translation reviews", () => {
    const repositoryManifest = contentManifestSchema.parse(repositoryManifestJson);
    const snapshot = buildAdminDashboardSnapshot(
      repositoryManifest,
      [],
      { version: 1, reviews: [] },
      [],
      "2026-08-28",
    );

    expect(snapshot.metrics.pendingTranslations).toBe(3);
    expect(snapshot.translationReviews.map((review) => review.question.id)).toEqual([
      "cpp11-toolchain-001",
      "cpp11-toolchain-002",
      "cpp11-toolchain-003",
    ]);
    expect(
      snapshot.translationReviews.map((review) => review.question.difficulty),
    ).toEqual(["beginner", "intermediate", "advanced"]);
    for (const review of snapshot.translationReviews) {
      expect(review.locale).toBe("en");
      expect(review.question.taxonomy.standard).toBe("cpp11");
      expect(review.question.taxonomy.tags).toContain("standard::cpp11");
      expect(review.question.taxonomy.tags).toContain(
        `difficulty::${review.question.difficulty}`,
      );
    }

    const approved = snapshot.translationReviews[0];
    const refreshed = buildAdminDashboardSnapshot(
      repositoryManifest,
      [],
      { version: 1, reviews: [] },
      [],
      "2026-08-28",
      [],
      [{
        questionId: approved.question.id,
        questionVersion: approved.question.version,
        sourceHash: approved.question.sourceHash,
        locale: approved.locale,
        prompt: approved.question.prompt,
        hint: approved.question.hint,
        answer: approved.question.answer,
        rubric: approved.question.rubric,
      }],
    );

    expect(refreshed.metrics.pendingTranslations).toBe(2);
    expect(refreshed.translationReviews.map((review) => review.question.id)).not
      .toContain(approved.question.id);
  });
});
