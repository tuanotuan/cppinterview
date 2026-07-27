import {
  worldQuantCompetencyKeys,
  worldQuantRoleProfileIds,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "../worldquant/readiness";

export type MockInterviewTrendDuration = 30 | 45 | 60;

/**
 * Client-safe structural subset of MockHistoryAttempt. Keeping the report
 * unknown avoids importing history.server and its `server-only` dependency.
 */
export type MockInterviewHistoryEntry = {
  attemptId: string;
  status: string;
  roleProfileId: string;
  roleProfileVersion: number;
  durationMinutes: number;
  completedAt: string | null;
  report: unknown;
};

export type MockInterviewCompetencyTrend = {
  latest: number | null;
  previous: number | null;
  delta: number | null;
  count: number;
};

export type MockInterviewTrends = {
  roleProfileId: WorldQuantRoleProfileId | null;
  roleProfileVersion: number | null;
  durationMinutes: MockInterviewTrendDuration | null;
  planMode: "balanced" | "targeted" | null;
  targetCompetency: WorldQuantCompetencyKey | null;
  filteredAttemptCount: number;
  comparableAttemptCount: number;
  assessedAttemptCount: number;
  competencies: Record<
    WorldQuantCompetencyKey,
    MockInterviewCompetencyTrend
  >;
};

type CompletedEntry = MockInterviewHistoryEntry & {
  roleProfileId: WorldQuantRoleProfileId;
  completedAt: string;
  completedAtMs: number;
  durationMinutes: MockInterviewTrendDuration;
  planMode: "balanced" | "targeted";
  targetCompetency: WorldQuantCompetencyKey | null;
};

export function buildWorldQuantMockTrends({
  entries,
  roleProfileId = null,
  durationMinutes = null,
}: {
  entries: readonly MockInterviewHistoryEntry[];
  roleProfileId?: WorldQuantRoleProfileId | null;
  durationMinutes?: MockInterviewTrendDuration | null;
}): MockInterviewTrends {
  const completed = entries
    .flatMap((entry): CompletedEntry[] => {
      if (
        entry.status !== "completed" ||
        entry.completedAt === null ||
        !worldQuantRoleProfileIds.includes(
          entry.roleProfileId as WorldQuantRoleProfileId,
        ) ||
        !Number.isInteger(entry.roleProfileVersion) ||
        entry.roleProfileVersion <= 0 ||
        !isMockDuration(entry.durationMinutes)
      ) {
        return [];
      }
      const completedAtMs = Date.parse(entry.completedAt);
      const scope = readTrendScope(entry.report);
      if (!Number.isFinite(completedAtMs) || !scope) return [];
      return [
        {
          ...entry,
          roleProfileId:
            entry.roleProfileId as WorldQuantRoleProfileId,
          completedAt: entry.completedAt,
          completedAtMs,
          durationMinutes: entry.durationMinutes,
          ...scope,
        },
      ];
    })
    .filter(
      (entry) =>
        (!roleProfileId ||
          entry.roleProfileId === roleProfileId) &&
        (!durationMinutes ||
          entry.durationMinutes === durationMinutes),
    )
    .sort(compareCompletedEntries);
  const anchor = completed.at(-1) ?? null;

  if (!anchor) {
    return {
      roleProfileId: null,
      roleProfileVersion: null,
      durationMinutes,
      planMode: null,
      targetCompetency: null,
      filteredAttemptCount: 0,
      comparableAttemptCount: 0,
      assessedAttemptCount: 0,
      competencies: emptyCompetencyTrends(),
    };
  }

  const comparable = completed.filter(
    (entry) =>
      entry.roleProfileId === anchor.roleProfileId &&
      entry.roleProfileVersion === anchor.roleProfileVersion &&
      entry.planMode === anchor.planMode &&
      entry.targetCompetency === anchor.targetCompetency,
  );
  const observations = new Map<
    WorldQuantCompetencyKey,
    number[]
  >(
    worldQuantCompetencyKeys.map((competency) => [
      competency,
      [],
    ]),
  );
  let assessedAttemptCount = 0;

  for (const entry of comparable) {
    const scores = readAssessedScores(entry.report);
    if (scores.size > 0) assessedAttemptCount += 1;
    for (const [competency, score] of scores) {
      observations.get(competency)!.push(score);
    }
  }

  const competencies = Object.fromEntries(
    worldQuantCompetencyKeys.map((competency) => {
      const scores = observations.get(competency)!;
      const latest = scores.at(-1) ?? null;
      const previous = scores.at(-2) ?? null;
      return [
        competency,
        {
          latest,
          previous,
          delta:
            latest !== null && previous !== null
              ? latest - previous
              : null,
          count: scores.length,
        },
      ];
    }),
  ) as Record<
    WorldQuantCompetencyKey,
    MockInterviewCompetencyTrend
  >;

  return {
    roleProfileId: anchor.roleProfileId,
    roleProfileVersion: anchor.roleProfileVersion,
    durationMinutes,
    planMode: anchor.planMode,
    targetCompetency: anchor.targetCompetency,
    filteredAttemptCount: completed.length,
    comparableAttemptCount: comparable.length,
    assessedAttemptCount,
    competencies,
  };
}

function readTrendScope(report: unknown): {
  planMode: "balanced" | "targeted";
  targetCompetency: WorldQuantCompetencyKey | null;
} | null {
  if (!isRecord(report) || !isRecord(report.plan)) return null;
  if (report.plan.mode === "balanced") {
    return {
      planMode: "balanced",
      targetCompetency: null,
    };
  }
  if (
    report.plan.mode === "targeted" &&
    worldQuantCompetencyKeys.includes(
      report.plan.targetCompetency as WorldQuantCompetencyKey,
    )
  ) {
    return {
      planMode: "targeted",
      targetCompetency:
        report.plan.targetCompetency as WorldQuantCompetencyKey,
    };
  }
  return null;
}

function readAssessedScores(
  report: unknown,
): Map<WorldQuantCompetencyKey, number> {
  if (!isRecord(report) || !isRecord(report.debrief)) {
    return new Map();
  }
  const rawCompetencies = report.debrief.competencies;
  if (!Array.isArray(rawCompetencies)) return new Map();

  const scores = new Map<WorldQuantCompetencyKey, number>();
  const ambiguous = new Set<WorldQuantCompetencyKey>();
  for (const raw of rawCompetencies) {
    if (
      !isRecord(raw) ||
      raw.status !== "assessed" ||
      !worldQuantCompetencyKeys.includes(
        raw.competency as WorldQuantCompetencyKey,
      ) ||
      !Number.isInteger(raw.score) ||
      (raw.score as number) < 0 ||
      (raw.score as number) > 100
    ) {
      continue;
    }
    const competency = raw.competency as WorldQuantCompetencyKey;
    if (scores.has(competency)) {
      ambiguous.add(competency);
      continue;
    }
    scores.set(competency, raw.score as number);
  }
  for (const competency of ambiguous) scores.delete(competency);
  return scores;
}

function compareCompletedEntries(
  left: CompletedEntry,
  right: CompletedEntry,
): number {
  return (
    left.completedAtMs - right.completedAtMs ||
    left.completedAt.localeCompare(right.completedAt) ||
    left.attemptId.localeCompare(right.attemptId)
  );
}

function emptyCompetencyTrends(): Record<
  WorldQuantCompetencyKey,
  MockInterviewCompetencyTrend
> {
  return Object.fromEntries(
    worldQuantCompetencyKeys.map((competency) => [
      competency,
      {
        latest: null,
        previous: null,
        delta: null,
        count: 0,
      },
    ]),
  ) as Record<
    WorldQuantCompetencyKey,
    MockInterviewCompetencyTrend
  >;
}

function isMockDuration(
  value: number,
): value is MockInterviewTrendDuration {
  return value === 30 || value === 45 || value === 60;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
