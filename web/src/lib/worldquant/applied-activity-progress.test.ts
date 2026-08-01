import { describe, expect, it } from "vitest";

import {
  EMPTY_APPLIED_ACTIVITY_PROGRESS,
  parseAppliedActivityProgress,
  recordAppliedActivityAttempt,
  serializeAppliedActivityProgress,
} from "./applied-activity-progress";

describe("applied activity progress", () => {
  it("round-trips a bounded, versioned attempt without arbitrary payloads", () => {
    const progress = recordAppliedActivityAttempt(
      EMPTY_APPLIED_ACTIVITY_PROGRESS,
      {
        activityId: "tick-replay-gap-recovery",
        activityVersion: 1,
        selections: { "event-1": "mark-stale" },
        passedCheckIds: ["sequence-continuity"],
        completedAt: "2026-07-30T12:00:00.000Z",
      },
    );

    expect(
      parseAppliedActivityProgress(
        serializeAppliedActivityProgress(progress),
      ),
    ).toEqual(progress);
  });

  it("fails closed for malformed or stale storage", () => {
    expect(parseAppliedActivityProgress("{broken")).toEqual(
      EMPTY_APPLIED_ACTIVITY_PROGRESS,
    );
    expect(
      parseAppliedActivityProgress(
        JSON.stringify({ version: 2, attempts: {} }),
      ),
    ).toEqual(EMPTY_APPLIED_ACTIVITY_PROGRESS);
  });

  it("replaces one activity attempt and caps retained activities", () => {
    let progress = EMPTY_APPLIED_ACTIVITY_PROGRESS;
    for (let index = 0; index < 85; index += 1) {
      progress = recordAppliedActivityAttempt(progress, {
        activityId: `activity-${index}`,
        activityVersion: 1,
        selections: {},
        passedCheckIds: [],
        completedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
      });
    }

    expect(Object.keys(progress.attempts)).toHaveLength(80);
    expect(progress.attempts["activity-84"]).toBeDefined();
    expect(progress.attempts["activity-0"]).toBeUndefined();
  });
});
