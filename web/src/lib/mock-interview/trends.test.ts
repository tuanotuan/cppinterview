import { describe, expect, it } from "vitest";

import type { WorldQuantCompetencyKey } from "../worldquant/readiness";
import {
  buildWorldQuantMockTrends,
  type MockInterviewHistoryEntry,
} from "./trends";

describe("WorldQuant mock interview trends", () => {
  it("sorts attempts deterministically and returns latest, previous, delta and count", () => {
    const entries = [
      attempt({
        attemptId: "attempt-c",
        completedAt: "2026-07-03T12:00:00.000Z",
        scores: { modern_cpp: 82 },
      }),
      attempt({
        attemptId: "attempt-a",
        completedAt: "2026-07-01T12:00:00.000Z",
        scores: { modern_cpp: 60 },
      }),
      attempt({
        attemptId: "attempt-b",
        completedAt: "2026-07-02T12:00:00.000Z",
        scores: { modern_cpp: 75 },
      }),
    ];

    const forward = buildWorldQuantMockTrends({ entries });
    const reversed = buildWorldQuantMockTrends({
      entries: [...entries].reverse(),
    });

    expect(reversed).toEqual(forward);
    expect(forward.competencies.modern_cpp).toEqual({
      latest: 82,
      previous: 75,
      delta: 7,
      count: 3,
    });
    expect(forward).toMatchObject({
      roleProfileId: "tick-data-platform",
      roleProfileVersion: 1,
      filteredAttemptCount: 3,
      comparableAttemptCount: 3,
      assessedAttemptCount: 3,
    });
  });

  it("never compares scores across role-profile versions", () => {
    const trends = buildWorldQuantMockTrends({
      entries: [
        attempt({
          attemptId: "v1",
          roleProfileVersion: 1,
          completedAt: "2026-07-01T12:00:00.000Z",
          scores: { modern_cpp: 90 },
        }),
        attempt({
          attemptId: "v2-a",
          roleProfileVersion: 2,
          completedAt: "2026-07-02T12:00:00.000Z",
          scores: { modern_cpp: 50 },
        }),
        attempt({
          attemptId: "v2-b",
          roleProfileVersion: 2,
          completedAt: "2026-07-03T12:00:00.000Z",
          scores: { modern_cpp: 65 },
        }),
      ],
    });

    expect(trends).toMatchObject({
      roleProfileVersion: 2,
      filteredAttemptCount: 3,
      comparableAttemptCount: 2,
    });
    expect(trends.competencies.modern_cpp).toEqual({
      latest: 65,
      previous: 50,
      delta: 15,
      count: 2,
    });
  });

  it("never compares balanced evidence with a targeted competency run", () => {
    const trends = buildWorldQuantMockTrends({
      entries: [
        attempt({
          attemptId: "balanced",
          completedAt: "2026-07-01T12:00:00.000Z",
          scores: { modern_cpp: 90 },
        }),
        attempt({
          attemptId: "targeted-a",
          planMode: "targeted",
          targetCompetency: "modern_cpp",
          completedAt: "2026-07-02T12:00:00.000Z",
          scores: { modern_cpp: 50 },
        }),
        attempt({
          attemptId: "targeted-b",
          planMode: "targeted",
          targetCompetency: "modern_cpp",
          completedAt: "2026-07-03T12:00:00.000Z",
          scores: { modern_cpp: 65 },
        }),
      ],
    });

    expect(trends).toMatchObject({
      planMode: "targeted",
      targetCompetency: "modern_cpp",
      comparableAttemptCount: 2,
    });
    expect(trends.competencies.modern_cpp).toMatchObject({
      latest: 65,
      previous: 50,
      count: 2,
    });
  });

  it("supports role and duration filters", () => {
    const entries = [
      attempt({
        attemptId: "tick-30",
        durationMinutes: 30,
        scores: { modern_cpp: 40 },
      }),
      attempt({
        attemptId: "tick-60",
        durationMinutes: 60,
        completedAt: "2026-07-02T12:00:00.000Z",
        scores: { modern_cpp: 70 },
      }),
      attempt({
        attemptId: "latency-60",
        roleProfileId: "low-latency-cpp",
        durationMinutes: 60,
        completedAt: "2026-07-03T12:00:00.000Z",
        scores: { modern_cpp: 85 },
      }),
    ];

    const trends = buildWorldQuantMockTrends({
      entries,
      roleProfileId: "tick-data-platform",
      durationMinutes: 60,
    });

    expect(trends).toMatchObject({
      roleProfileId: "tick-data-platform",
      roleProfileVersion: 1,
      durationMinutes: 60,
      filteredAttemptCount: 1,
      comparableAttemptCount: 1,
      assessedAttemptCount: 1,
    });
    expect(trends.competencies.modern_cpp).toEqual({
      latest: 70,
      previous: null,
      delta: null,
      count: 1,
    });
  });

  it("ignores not-assessed, null, unknown and malformed competency scores", () => {
    const entry = attempt({
      attemptId: "mixed-evidence",
      rawCompetencies: [
        competency("modern_cpp", "not_assessed", 99),
        competency("tick_market_data", "assessed", null),
        competency("performance_latency", "assessed", 72),
        competency("unknown", "assessed", 88),
        competency("build_delivery", "assessed", 101),
      ],
    });
    const trends = buildWorldQuantMockTrends({ entries: [entry] });

    expect(trends.assessedAttemptCount).toBe(1);
    expect(trends.competencies.modern_cpp.count).toBe(0);
    expect(trends.competencies.tick_market_data.count).toBe(0);
    expect(trends.competencies.performance_latency).toEqual({
      latest: 72,
      previous: null,
      delta: null,
      count: 1,
    });
    expect(trends.competencies.build_delivery.count).toBe(0);
  });

  it("uses attempt ID as the stable final tie-break for equal timestamps", () => {
    const entries = [
      attempt({
        attemptId: "attempt-z",
        scores: { modern_cpp: 80 },
      }),
      attempt({
        attemptId: "attempt-a",
        scores: { modern_cpp: 60 },
      }),
    ];

    const trends = buildWorldQuantMockTrends({ entries });

    expect(trends.competencies.modern_cpp).toEqual({
      latest: 80,
      previous: 60,
      delta: 20,
      count: 2,
    });
  });

  it("ignores incomplete and malformed attempts while preserving a stable empty result", () => {
    const trends = buildWorldQuantMockTrends({
      entries: [
        attempt({
          attemptId: "reserved",
          status: "reserved",
          completedAt: null,
        }),
        attempt({
          attemptId: "bad-date",
          completedAt: "not-a-date",
        }),
        attempt({
          attemptId: "unknown-role",
          roleProfileId: "unknown-role",
        }),
      ],
      durationMinutes: 45,
    });

    expect(trends).toMatchObject({
      roleProfileId: null,
      roleProfileVersion: null,
      durationMinutes: 45,
      filteredAttemptCount: 0,
      comparableAttemptCount: 0,
      assessedAttemptCount: 0,
    });
    expect(trends.competencies.ownership_communication).toEqual({
      latest: null,
      previous: null,
      delta: null,
      count: 0,
    });
  });

  it("drops an ambiguous duplicate competency from one attempt", () => {
    const trends = buildWorldQuantMockTrends({
      entries: [
        attempt({
          rawCompetencies: [
            competency("modern_cpp", "assessed", 60),
            competency("modern_cpp", "assessed", 90),
          ],
        }),
      ],
    });

    expect(trends.assessedAttemptCount).toBe(0);
    expect(trends.competencies.modern_cpp.count).toBe(0);
  });
});

function attempt({
  attemptId = "attempt-1",
  status = "completed",
  roleProfileId = "tick-data-platform",
  roleProfileVersion = 1,
  durationMinutes = 45,
  completedAt = "2026-07-01T12:00:00.000Z",
  scores = {},
  rawCompetencies,
  planMode = "balanced",
  targetCompetency = null,
}: {
  attemptId?: string;
  status?: string;
  roleProfileId?: string;
  roleProfileVersion?: number;
  durationMinutes?: number;
  completedAt?: string | null;
  scores?: Record<string, number>;
  rawCompetencies?: unknown[];
  planMode?: "balanced" | "targeted";
  targetCompetency?: WorldQuantCompetencyKey | null;
} = {}): MockInterviewHistoryEntry {
  const competencies =
    rawCompetencies ??
    Object.entries(scores).map(([key, score]) =>
      competency(key, "assessed", score),
    );
  return {
    attemptId,
    status,
    roleProfileId,
    roleProfileVersion,
    durationMinutes,
    completedAt,
    report: {
      schemaVersion: 4,
      plan: {
        mode: planMode,
        targetCompetency,
      },
      debrief: { competencies },
    },
  };
}

function competency(
  key: string,
  status: "assessed" | "not_assessed",
  score: number | null,
) {
  return { competency: key, status, score };
}
