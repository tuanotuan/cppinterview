import { describe, expect, it } from "vitest";

import {
  buildWorldQuantTargetedMockPlan,
  targetedMockPlanSchema,
  type TargetedMockCandidate,
} from "./target-plan";
import type { WorldQuantCompetencyKey } from "../worldquant/readiness";

describe("WorldQuant targeted mock planner", () => {
  it("builds a versioned JSON-safe plan with exact immutable refs", () => {
    const candidate = question({
      id: "modern-cpp-lifetime",
      origin: "question_bank",
      version: 3,
      contentRevision: "a".repeat(64),
      estimatedMinutes: 7,
      responseMode: "code",
      execution: { specRevision: 2 },
    });

    const plan = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "targeted",
      targetCompetency: "modern_cpp",
      durationMinutes: 30,
      candidates: [candidate],
    });
    const roundTrip = JSON.parse(JSON.stringify(plan));

    expect(targetedMockPlanSchema.parse(roundTrip)).toEqual(plan);
    expect(plan).toEqual({
      version: 1,
      profileId: "tick-data-platform",
      profileVersion: 1,
      mode: "targeted",
      targetCompetency: "modern_cpp",
      variant: 1,
      durationMinutes: 30,
      scheduledMinutes: 7,
      questions: [candidate],
      contentGaps: [],
    });
  });

  it("is deterministic regardless of candidate input order", () => {
    const candidates = [
      question({ id: "modern-a", competency: "modern_cpp" }),
      question({
        id: "tick-a",
        competency: "tick_market_data",
      }),
      question({
        id: "concurrency-a",
        competency: "concurrency_memory",
      }),
      question({
        id: "performance-a",
        competency: "performance_latency",
      }),
      question({
        id: "algorithms-a",
        competency: "algorithms_data_structures",
      }),
    ];

    const forward = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "balanced",
      durationMinutes: 30,
      candidates,
    });
    const reversed = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "balanced",
      durationMinutes: 30,
      candidates: [...candidates].reverse(),
    });

    expect(reversed).toEqual(forward);
  });

  it("uses role weights for balanced selection and only the gap for targeted selection", () => {
    const candidates = [
      question({
        id: "modern-a",
        competency: "modern_cpp",
        estimatedMinutes: 15,
      }),
      question({
        id: "tick-a",
        competency: "tick_market_data",
        estimatedMinutes: 15,
      }),
      question({
        id: "build-a",
        competency: "build_delivery",
        estimatedMinutes: 15,
      }),
    ];

    const balanced = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "balanced",
      durationMinutes: 30,
      candidates,
    });
    const targeted = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "targeted",
      targetCompetency: "build_delivery",
      durationMinutes: 30,
      candidates,
    });

    expect(
      balanced.questions.map(
        (candidate) => candidate.readinessCompetency,
      ),
    ).toEqual(["modern_cpp", "tick_market_data"]);
    expect(targeted.questions).toEqual([candidates[2]]);
  });

  it("filters zero-weight role candidates and rejects an invalid target", () => {
    const candidates = [
      question({ id: "modern", competency: "modern_cpp" }),
      question({
        id: "tick",
        competency: "tick_market_data",
      }),
    ];

    const plan = buildWorldQuantTargetedMockPlan({
      profileId: "cpp-data-platform",
      mode: "balanced",
      durationMinutes: 30,
      candidates,
    });

    expect(plan.questions.map(({ question: ref }) => ref.id)).toEqual([
      "modern",
    ]);
    expect(() =>
      buildWorldQuantTargetedMockPlan({
        profileId: "cpp-data-platform",
        mode: "targeted",
        targetCompetency: "tick_market_data",
        durationMinutes: 30,
        candidates,
      }),
    ).toThrow(/zero weight/);
    expect(() =>
      buildWorldQuantTargetedMockPlan({
        profileId: "cpp-data-platform",
        mode: "targeted",
        targetCompetency: "not-real" as WorldQuantCompetencyKey,
        durationMinutes: 30,
        candidates,
      }),
    ).toThrow(/Unknown WorldQuant competency/);
  });

  it("never exceeds the duration budget and skips a question that does not fit", () => {
    const plan = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "targeted",
      targetCompetency: "modern_cpp",
      durationMinutes: 30,
      candidates: [
        question({ id: "a", estimatedMinutes: 15 }),
        question({ id: "b", estimatedMinutes: 10 }),
        question({ id: "c", estimatedMinutes: 10 }),
      ],
    });

    expect(plan.scheduledMinutes).toBe(25);
    expect(plan.scheduledMinutes).toBeLessThanOrEqual(
      plan.durationMinutes,
    );
    expect(plan.questions.map(({ question: ref }) => ref.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("reports honest content gaps for competencies without candidates", () => {
    const plan = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "targeted",
      targetCompetency: "tick_market_data",
      durationMinutes: 30,
      candidates: [
        question({ id: "modern", competency: "modern_cpp" }),
      ],
    });

    expect(plan.questions).toEqual([]);
    expect(plan.contentGaps).toEqual([
      {
        competency: "tick_market_data",
        reason: "no_eligible_question",
      },
    ]);
  });

  it("deduplicates identical logical identities and rejects conflicting ones", () => {
    const duplicate = question({ id: "same-question" });
    const deduplicated = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "targeted",
      targetCompetency: "modern_cpp",
      durationMinutes: 30,
      candidates: [duplicate, structuredClone(duplicate)],
    });

    expect(deduplicated.questions).toHaveLength(1);
    expect(() =>
      buildWorldQuantTargetedMockPlan({
        profileId: "tick-data-platform",
        mode: "targeted",
        targetCompetency: "modern_cpp",
        durationMinutes: 30,
        candidates: [
          duplicate,
          question({ id: "same-question", version: 2 }),
        ],
      }),
    ).toThrow(/Conflicting mock candidates/);
  });

  it("rejects the same raw ID across origins because downstream evidence is keyed by ID", () => {
    expect(() =>
      buildWorldQuantTargetedMockPlan({
        profileId: "tick-data-platform",
        mode: "targeted",
        targetCompetency: "modern_cpp",
        durationMinutes: 30,
        candidates: [
          question({
            id: "shared-question",
            origin: "role_profile",
          }),
          question({
            id: "shared-question",
            origin: "question_bank",
            contentRevision: "a".repeat(64),
          }),
        ],
      }),
    ).toThrow(/Conflicting mock candidates/);
  });

  it("uses the variant only as a deterministic tie-break rotation", () => {
    const candidates = [
      question({ id: "a" }),
      question({ id: "b" }),
      question({ id: "c" }),
    ];
    const first = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "targeted",
      targetCompetency: "modern_cpp",
      durationMinutes: 30,
      variant: 1,
      candidates,
    });
    const second = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "targeted",
      targetCompetency: "modern_cpp",
      durationMinutes: 30,
      variant: 2,
      candidates,
    });

    expect(first.questions.map(({ question: ref }) => ref.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(second.questions.map(({ question: ref }) => ref.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });
});

function question(
  overrides: Partial<
    TargetedMockCandidate["question"] & {
      competency: WorldQuantCompetencyKey;
    }
  > = {},
): TargetedMockCandidate {
  const {
    competency = "modern_cpp",
    ...questionOverrides
  } = overrides;
  return {
    question: {
      id: "modern-question",
      origin: "role_profile",
      version: 1,
      contentRevision: "role-profile-v1",
      estimatedMinutes: 5,
      responseMode: "text",
      language: "cpp",
      track: "cpp20",
      ...questionOverrides,
    },
    readinessCompetency: competency,
  };
}
