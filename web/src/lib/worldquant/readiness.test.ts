import { describe, expect, it } from "vitest";

import type { QuestionLearningState } from "@/lib/practice/learning-state";

import {
  buildWorldQuantReadiness,
  classifyWorldQuantCompetency,
  isValidReadinessDateKey,
  learningEvidence,
  mapLegacyMockCompetency,
  worldQuantCompetencyKeys,
  worldQuantRoleProfiles,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
} from "./readiness";

describe("WorldQuant competency model", () => {
  it("defines every competency with weights totaling 100 for each role", () => {
    for (const profile of worldQuantRoleProfiles) {
      expect(Object.keys(profile.weights).sort()).toEqual(
        [...worldQuantCompetencyKeys].sort(),
      );
      expect(Object.keys(profile.targets).sort()).toEqual(
        [...worldQuantCompetencyKeys].sort(),
      );
      expect(
        Object.values(profile.weights).reduce(
          (sum, weight) => sum + weight,
          0,
        ),
      ).toBe(100);
      expect(Object.values(profile.targets).every((target) => target > 0)).toBe(
        true,
      );
    }
  });

  it.each([
    ["cmake-build-systems", ["target"], "build_delivery"],
    ["python-interview", ["containers"], "scripting_automation"],
    ["cpp-interview", ["tick-data", "sequencing"], "tick_market_data"],
    ["cpp-interview", ["rpc", "replication"], "distributed_data_platform"],
    ["cpp-interview", ["atomic", "memory-model"], "concurrency_memory"],
    ["cpp-interview", ["algorithm", "complexity"], "algorithms_data_structures"],
    ["cpp-interview", ["socket", "linux"], "linux_networking"],
    ["cpp-interview", ["alignment", "cache"], "performance_latency"],
    ["cpp-interview", ["lambda", "lifetime"], "modern_cpp"],
    ["cpp-interview", ["unknown-topic"], "modern_cpp"],
  ] as const)(
    "classifies %s / %j as %s",
    (deckId, topics, expected) => {
      expect(
        classifyWorldQuantCompetency({
          deckId,
          lessonId: "example-lesson",
          topics: [...topics],
        }),
      ).toBe(expected);
    },
  );

  it("uses deterministic tie-breaking independent of topic order", () => {
    const first = classifyWorldQuantCompetency({
      deckId: "cpp-interview",
      lessonId: "cpp11-auto",
      topics: ["performance", "reference", "type-deduction"],
    });
    const reversed = classifyWorldQuantCompetency({
      deckId: "cpp-interview",
      lessonId: "cpp11-auto",
      topics: ["type-deduction", "reference", "performance"],
    });

    expect(first).toBe("modern_cpp");
    expect(reversed).toBe(first);
  });

  it("maps broad legacy mock competencies without duplicating one score", () => {
    expect(
      mapLegacyMockCompetency({ key: "tick_data_order_book" }),
    ).toEqual({
      key: "tick_market_data",
      granularity: "direct",
    });
    expect(
      mapLegacyMockCompetency({
        key: "data_pipeline_performance",
        topics: ["atomic", "memory-model"],
      }),
    ).toEqual({
      key: "concurrency_memory",
      granularity: "topic_refined",
    });
    expect(
      mapLegacyMockCompetency({ key: "data_pipeline_performance" }),
    ).toEqual({
      key: "performance_latency",
      granularity: "legacy_fallback",
    });
  });

  it("validates persisted target dates as real calendar days", () => {
    expect(isValidReadinessDateKey("2028-02-29")).toBe(true);
    expect(isValidReadinessDateKey("2027-02-29")).toBe(false);
    expect(isValidReadinessDateKey("2026-99-99")).toBe(false);
    expect(isValidReadinessDateKey("not-a-date")).toBe(false);
  });
});

describe("WorldQuant readiness evidence", () => {
  it("assigns transparent evidence values and safety caps", () => {
    expect(learningEvidence(undefined)).toBe(0);
    expect(learningEvidence(state({ state: "new" }))).toBe(0);
    expect(learningEvidence(state({ state: "learning" }))).toBe(0.35);
    expect(learningEvidence(state({ state: "relearning" }))).toBe(0.15);
    expect(
      learningEvidence(state({ state: "review", intervalDays: 6 })),
    ).toBe(0.5);
    expect(
      learningEvidence(state({ state: "review", intervalDays: 7 })),
    ).toBe(0.75);
    expect(
      learningEvidence(state({ state: "review", intervalDays: 21 })),
    ).toBe(1);
    expect(
      learningEvidence(
        state({
          state: "review",
          intervalDays: 30,
          contentChanged: true,
        }),
      ),
    ).toBe(0.15);
    expect(
      learningEvidence(
        state({ state: "review", intervalDays: 30, leech: true }),
      ),
    ).toBe(0.25);
    expect(
      learningEvidence(
        state({ state: "review", intervalDays: 30, suspended: true }),
      ),
    ).toBe(0);
  });

  it("reports content coverage separately from personal preparation", () => {
    const questions = questionsFor("modern_cpp", 6);
    const states = new Map(
      questions.map((question) => [
        question.id,
        state({ questionId: question.id, state: "new" }),
      ]),
    );
    const result = buildWorldQuantReadiness({
      profileId: "tick-data-platform",
      questions,
      states,
      today: "2026-07-26",
    });
    const modern = result.competencies.find(
      (competency) => competency.key === "modern_cpp",
    )!;

    expect(modern.coveragePercent).toBe(100);
    expect(modern.preparedPercent).toBe(0);
    expect(modern.gapKind).toBe("learning");
  });

  it("reports a mixed gap when the bank and learning evidence are both incomplete", () => {
    const questions = questionsFor("modern_cpp", 5);
    const states = new Map(
      questions.map((item) => [
        item.id,
        state({ questionId: item.id, state: "new" }),
      ]),
    );
    const result = buildWorldQuantReadiness({
      profileId: "tick-data-platform",
      questions,
      states,
      today: "2026-07-26",
    });
    const modern = result.competencies.find(
      (competency) => competency.key === "modern_cpp",
    )!;

    expect(modern).toMatchObject({
      coveragePercent: 83,
      learningWithinCoveragePercent: 0,
      gapKind: "mixed",
    });
  });

  it("caps each lesson at two evidence cards", () => {
    const questions = [0, 1, 2].map((index) =>
      question({
        id: `modern-${index}`,
        competency: "modern_cpp",
        lessonId: "same-lesson",
      }),
    );
    const states = new Map(
      questions.map((item, index) => [
        item.id,
        state({
          questionId: item.id,
          state: index === 0 ? "new" : "review",
          intervalDays: 30,
        }),
      ]),
    );
    const result = buildWorldQuantReadiness({
      profileId: "tick-data-platform",
      questions,
      states,
      today: "2026-07-26",
    });
    const modern = result.competencies.find(
      (competency) => competency.key === "modern_cpp",
    )!;

    expect(modern.effectiveCount).toBe(2);
    expect(modern.coveragePercent).toBe(33);
    expect(modern.preparedPercent).toBe(33);
    expect(modern.matureCount).toBe(2);
  });

  it("reaches full preparation with enough mature evidence", () => {
    const questions = questionsFor("modern_cpp", 6);
    const states = new Map(
      questions.map((item) => [
        item.id,
        state({
          questionId: item.id,
          state: "review",
          intervalDays: 30,
        }),
      ]),
    );
    const result = buildWorldQuantReadiness({
      profileId: "tick-data-platform",
      questions,
      states,
      today: "2026-07-26",
    });
    const modern = result.competencies.find(
      (competency) => competency.key === "modern_cpp",
    )!;

    expect(modern.coveragePercent).toBe(100);
    expect(modern.preparedPercent).toBe(100);
  });

  it("marks missing bank coverage as limited evidence, not user weakness", () => {
    const result = buildWorldQuantReadiness({
      profileId: "tick-data-platform",
      questions: [],
      states: new Map(),
      today: "2026-07-26",
    });

    expect(result).toMatchObject({
      preparationIndex: 0,
      coveragePercent: 0,
      status: "limited_evidence",
    });
    expect(
      result.competencies.every(
        (competency) =>
          Number.isFinite(competency.preparedPercent) &&
          competency.gapKind === "content",
      ),
    ).toBe(true);
  });

  it("keeps the headline limited when a core competency lacks coverage", () => {
    const competenciesWithoutTick = worldQuantCompetencyKeys.filter(
      (key) => key !== "tick_market_data",
    );
    const questions = competenciesWithoutTick.flatMap((key) =>
      questionsFor(key, targetForTickRole(key)),
    );
    const states = new Map(
      questions.map((item) => [
        item.id,
        state({
          questionId: item.id,
          state: "review",
          intervalDays: 30,
        }),
      ]),
    );
    const result = buildWorldQuantReadiness({
      profileId: "tick-data-platform",
      questions,
      states,
      today: "2026-07-26",
    });

    expect(result.coveragePercent).toBeGreaterThan(60);
    expect(result.status).toBe("limited_evidence");
  });

  it("keeps validation provenance and due evidence visible", () => {
    const verified = question({
      id: "verified-card",
      competency: "modern_cpp",
      validation: "repository_verified",
    });
    const approved = question({
      id: "approved-card",
      competency: "modern_cpp",
      validation: "owner_approved",
      lessonId: "lesson-approved",
    });
    const result = buildWorldQuantReadiness({
      profileId: "tick-data-platform",
      questions: [verified, approved],
      states: new Map([
        [
          verified.id,
          state({
            questionId: verified.id,
            state: "review",
            dueOn: "2026-07-25",
          }),
        ],
        [
          approved.id,
          state({
            questionId: approved.id,
            state: "review",
            dueOn: "2026-07-27",
          }),
        ],
      ]),
      today: "2026-07-26",
    });

    expect(result).toMatchObject({
      repositoryVerifiedCount: 1,
      ownerApprovedCount: 1,
      dueCount: 1,
    });
  });

  it("excludes zero-weight competencies from role headline totals", () => {
    const modern = question({
      id: "modern-card",
      competency: "modern_cpp",
    });
    const tick = question({
      id: "tick-card",
      competency: "tick_market_data",
      lessonId: "tick-lesson",
    });
    const result = buildWorldQuantReadiness({
      profileId: "cpp-data-platform",
      questions: [modern, tick],
      states: new Map([
        [modern.id, state({ questionId: modern.id, state: "new" })],
        [tick.id, state({ questionId: tick.id, state: "new" })],
      ]),
      today: "2026-07-26",
    });

    expect(result).toMatchObject({
      questionCount: 1,
      repositoryVerifiedCount: 1,
      newCount: 1,
    });
  });
});

function questionsFor(
  competency: WorldQuantCompetencyKey,
  count: number,
): ReadinessQuestionSummary[] {
  return Array.from({ length: count }, (_, index) =>
    question({
      id: `${competency.replaceAll("_", "-")}-${index}`,
      competency,
      lessonId: `${competency.replaceAll("_", "-")}-lesson-${Math.floor(index / 2)}`,
    }),
  );
}

function question({
  id,
  competency,
  lessonId = "example-lesson",
  validation = "repository_verified",
}: {
  id: string;
  competency: WorldQuantCompetencyKey;
  lessonId?: string;
  validation?: ReadinessQuestionSummary["validation"];
}): ReadinessQuestionSummary {
  return {
    id,
    version: 1,
    sourceHash: "a".repeat(64),
    deckId: "cpp-interview",
    lessonId,
    estimatedMinutes: 5,
    competency,
    validation,
  };
}

function state(
  overrides: Partial<QuestionLearningState> = {},
): QuestionLearningState {
  return {
    questionId: "question",
    questionVersion: 1,
    sourceHash: "a".repeat(64),
    state: "review",
    dueOn: "2026-08-01",
    intervalDays: 3,
    reviewCount: 1,
    lapseCount: 0,
    lastRating: "good",
    lastReviewedOn: "2026-07-20",
    suspended: false,
    leech: false,
    contentChanged: false,
    historyResetOn: null,
    historyResetToken: null,
    ...overrides,
  };
}

function targetForTickRole(key: WorldQuantCompetencyKey) {
  return worldQuantRoleProfiles.find(
    (profile) => profile.id === "tick-data-platform",
  )!.targets[key];
}
