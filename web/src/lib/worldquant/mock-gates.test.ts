import { describe, expect, it } from "vitest";

import { buildWorldQuantMockGates } from "./mock-gates";
import type { TargetedMockPlan } from "../mock-interview/target-plan";

const plan: TargetedMockPlan = {
  version: 2,
  profileId: "tick-data-platform",
  profileVersion: 2,
  mode: "balanced",
  targetCompetency: null,
  variant: 2,
  blueprintId: "migration-incident",
  blueprintVersion: 1,
  durationMinutes: 45,
  scheduledMinutes: 21,
  questions: [
    {
      readinessCompetency: "modern_cpp",
      question: {
        id: "cpp",
        origin: "role_profile",
        version: 1,
        contentRevision: "role-v2",
        estimatedMinutes: 7,
        responseMode: "code",
        language: "cpp",
        track: "cpp20",
        scenarioFamilies: ["migration-incident"],
      },
    },
    {
      readinessCompetency: "tick_market_data",
      question: {
        id: "tick",
        origin: "role_profile",
        version: 1,
        contentRevision: "role-v2",
        estimatedMinutes: 7,
        responseMode: "text",
        language: "cpp",
        track: "cpp20",
        scenarioFamilies: ["migration-incident"],
      },
    },
    {
      readinessCompetency: "ownership_communication",
      question: {
        id: "migration",
        origin: "role_profile",
        version: 1,
        contentRevision: "role-v2",
        estimatedMinutes: 7,
        responseMode: "text",
        language: "cpp",
        track: "cpp20",
        scenarioFamilies: ["migration-incident"],
      },
    },
  ],
  contentGaps: [],
};

describe("WorldQuant mock evidence gates", () => {
  it("marks only evidenced gates and never claims role readiness", () => {
    const result = buildWorldQuantMockGates({
      plan,
      scores: [
        { questionId: "cpp", score: 80 },
        { questionId: "tick", score: 64 },
        { questionId: "migration", score: 72 },
      ],
      executionByQuestionId: new Map(),
    });

    expect(result.roleReadinessClaim).toBe("not_claimed");
    expect(result.gates.map((gate) => gate.status)).toEqual([
      "passed",
      "needs_work",
      "passed",
    ]);
  });

  it("does not infer a migration gate from a new-feed scenario", () => {
    const result = buildWorldQuantMockGates({
      plan: { ...plan, blueprintId: "new-feed", variant: 1 },
      scores: [
        { questionId: "cpp", score: 80 },
        { questionId: "tick", score: 80 },
        { questionId: "migration", score: 80 },
      ],
      executionByQuestionId: new Map(),
    });

    expect(result.gates.at(-1)).toMatchObject({
      key: "migration_evidence",
      status: "not_assessed",
      score: null,
    });
  });
});
