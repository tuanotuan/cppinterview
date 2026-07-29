import { describe, expect, it } from "vitest";

import {
  buildContributionCalendar,
  contributionLevel,
  contributionStartDate,
  timestampToVietnamDateKey,
} from "./contribution-activity";

describe("contribution activity", () => {
  it("aligns the 53-week calendar to Sunday", () => {
    expect(contributionStartDate("2026-07-29")).toBe("2025-07-27");
  });

  it("aggregates activity sources and ignores future or out-of-range events", () => {
    const calendar = buildContributionCalendar({
      today: "2026-07-29",
      events: [
        { occurredOn: "2026-07-28", source: "review" },
        { occurredOn: "2026-07-28", source: "review" },
        { occurredOn: "2026-07-28", source: "coach" },
        { occurredOn: "2026-07-29", source: "mock" },
        { occurredOn: "2026-07-30", source: "review" },
        { occurredOn: "2024-01-01", source: "review" },
      ],
    });

    expect(calendar.totalContributions).toBe(4);
    expect(calendar.activeDays).toBe(2);
    expect(calendar.currentStreak).toBe(2);
    expect(calendar.longestStreak).toBe(2);
    expect(calendar.totals).toEqual({ review: 2, coach: 1, mock: 1 });
    expect(
      calendar.days.find((day) => day.date === "2026-07-28"),
    ).toMatchObject({
      reviewCount: 2,
      coachCount: 1,
      mockCount: 0,
      total: 3,
      level: 2,
    });
  });

  it("calculates the longest streak independently from the current streak", () => {
    const calendar = buildContributionCalendar({
      today: "2026-07-29",
      events: [
        { occurredOn: "2026-07-20", source: "review" },
        { occurredOn: "2026-07-21", source: "review" },
        { occurredOn: "2026-07-22", source: "review" },
        { occurredOn: "2026-07-29", source: "coach" },
      ],
    });

    expect(calendar.currentStreak).toBe(1);
    expect(calendar.longestStreak).toBe(3);
  });

  it("uses stable intensity thresholds", () => {
    expect([0, 1, 2, 3, 4, 6, 7].map(contributionLevel)).toEqual([
      0, 1, 2, 2, 3, 3, 4,
    ]);
  });

  it("maps timestamps to the Vietnam activity date", () => {
    expect(timestampToVietnamDateKey("2026-07-28T17:30:00.000Z")).toBe(
      "2026-07-29",
    );
    expect(timestampToVietnamDateKey("invalid")).toBeNull();
  });
});
