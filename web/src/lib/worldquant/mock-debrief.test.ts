import { describe, expect, it } from "vitest";

import {
  buildWorldQuantMockDebrief,
  worldQuantMockDebriefSchema,
  type NormalizedWorldQuantMockQuestionScore,
  type WorldQuantMockQuestionMapping,
} from "./mock-debrief";

describe("WorldQuant mock debrief", () => {
  it("derives canonical competency evidence and role-weighted gaps", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "balanced",
        questionMappings: [
          mapping("cpp-question", "modern_cpp"),
          mapping("tick-question", "tick_market_data"),
        ],
      },
      scores: [
        score("cpp-question", 80),
        score("tick-question", 50),
      ],
    });

    expect(debrief).toMatchObject({
      version: 1,
      profileId: "tick-data-platform",
      profileVersion: 1,
      planMode: "balanced",
      scope: "balanced_role_evidence",
      assessedWeightPercent: 38,
      roleInterviewScore: 66,
      evidenceQuestionCount: 2,
    });
    expect(debrief.competencies).toHaveLength(10);
    expect(
      debrief.competencies.find(
        (item) => item.competency === "tick_market_data",
      ),
    ).toEqual({
      competency: "tick_market_data",
      status: "assessed",
      roleWeight: 18,
      score: 50,
      scoreDeficit: 50,
      weightedDeficit: 9,
      evidenceCount: 1,
      evidenceQuestionIds: ["tick-question"],
    });
    expect(debrief.rankedGaps.map((gap) => gap.competency)).toEqual([
      "tick_market_data",
      "modern_cpp",
    ]);
    expect(debrief.rankedGaps.map((gap) => gap.weightedDeficit)).toEqual([
      9, 4,
    ]);
  });

  it("labels a targeted result as scoped evidence without readiness claims", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "targeted",
        questionMappings: [
          mapping("targeted-question", "performance_latency"),
        ],
      },
      scores: [score("targeted-question", 72)],
    });

    expect(debrief.scope).toBe("targeted_evidence");
    expect(debrief.assessedWeightPercent).toBe(12);
    expect(debrief.roleInterviewScore).toBe(72);
    expect(debrief).not.toHaveProperty("readiness");
    expect(debrief).not.toHaveProperty("overallScore");
  });

  it("averages per-question scores and is deterministic across input order", () => {
    const mappings = [
      mapping("z-question", "modern_cpp"),
      mapping("a-question", "modern_cpp"),
      mapping("tick-question", "tick_market_data"),
    ];
    const scores = [
      score("z-question", 60),
      score("a-question", 80),
      score("tick-question", 70),
    ];
    const first = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: { mode: "balanced", questionMappings: mappings },
      scores,
    });
    const reversed = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "balanced",
        questionMappings: [...mappings].reverse(),
      },
      scores: [...scores].reverse(),
    });

    expect(reversed).toEqual(first);
    expect(
      first.competencies.find(
        (item) => item.competency === "modern_cpp",
      ),
    ).toMatchObject({
      score: 70,
      evidenceCount: 2,
      evidenceQuestionIds: ["a-question", "z-question"],
    });
  });

  it("uses the competency key as a deterministic gap tie-breaker", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "balanced",
        questionMappings: [
          mapping("algorithm", "algorithms_data_structures"),
          mapping("build", "build_delivery"),
        ],
      },
      scores: [score("algorithm", 50), score("build", 50)],
    });

    expect(debrief.rankedGaps.map((gap) => gap.competency)).toEqual([
      "algorithms_data_structures",
      "build_delivery",
    ]);
  });

  it("requires scores to match the exact planned question set", () => {
    const input = {
      profileId: "tick-data-platform" as const,
      plan: {
        mode: "targeted" as const,
        questionMappings: [mapping("expected", "modern_cpp")],
      },
    };

    expect(() =>
      buildWorldQuantMockDebrief({
        ...input,
        scores: [score("unexpected", 70)],
      }),
    ).toThrow("exact planned question set");
    expect(() =>
      buildWorldQuantMockDebrief({
        ...input,
        plan: {
          ...input.plan,
          questionMappings: [
            mapping("expected", "modern_cpp"),
            mapping("expected", "modern_cpp"),
          ],
        },
        scores: [score("expected", 70), score("other", 60)],
      }),
    ).toThrow("duplicate question");
    expect(() =>
      buildWorldQuantMockDebrief({
        ...input,
        scores: [score("expected", 70), score("expected", 60)],
      }),
    ).toThrow("duplicate question");
  });

  it("returns no role score when evidence only covers a zero-weight area", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "cpp-data-platform",
      plan: {
        mode: "targeted",
        questionMappings: [
          mapping("tick-only", "tick_market_data"),
        ],
      },
      scores: [score("tick-only", 20)],
    });

    expect(debrief.assessedWeightPercent).toBe(0);
    expect(debrief.roleInterviewScore).toBeNull();
    expect(debrief.rankedGaps).toEqual([]);
    expect(worldQuantMockDebriefSchema.parse(debrief)).toEqual(debrief);
  });

  it("rejects tampered role weights and remediation gap ordering", () => {
    const debrief = buildWorldQuantMockDebrief({
      profileId: "tick-data-platform",
      plan: {
        mode: "balanced",
        questionMappings: [
          mapping("cpp", "modern_cpp"),
          mapping("tick", "tick_market_data"),
        ],
      },
      scores: [score("cpp", 60), score("tick", 60)],
    });
    const modernIndex = debrief.competencies.findIndex(
      (item) => item.competency === "modern_cpp",
    );

    expect(
      worldQuantMockDebriefSchema.safeParse({
        ...debrief,
        competencies: debrief.competencies.map((item, index) =>
          index === modernIndex ? { ...item, roleWeight: 19 } : item,
        ),
        assessedWeightPercent: 37,
      }).success,
    ).toBe(false);
    expect(
      worldQuantMockDebriefSchema.safeParse({
        ...debrief,
        rankedGaps: [...debrief.rankedGaps].reverse(),
      }).success,
    ).toBe(false);
  });
});

function mapping(
  questionId: string,
  competency: WorldQuantMockQuestionMapping["competency"],
): WorldQuantMockQuestionMapping {
  return { questionId, competency };
}

function score(
  questionId: string,
  value: number,
): NormalizedWorldQuantMockQuestionScore {
  return { questionId, score: value };
}
