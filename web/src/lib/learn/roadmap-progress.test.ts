import { describe, expect, it } from "vitest";

import {
  parseRoadmapProgressStates,
  summarizeRoadmapProgress,
  toggledRoadmapProgressStatus,
} from "./roadmap-progress";

describe("roadmap progress", () => {
  it("toggles the selected state back to pending", () => {
    expect(toggledRoadmapProgressStatus(undefined, "learning")).toBe(
      "learning",
    );
    expect(toggledRoadmapProgressStatus("learning", "learning")).toBeNull();
    expect(toggledRoadmapProgressStatus("learning", "done")).toBe("done");
  });

  it("counts done and skipped as route completion while keeping them separate", () => {
    expect(
      summarizeRoadmapProgress(
        ["one", "two", "three", "four"],
        {
          one: "learning",
          two: "done",
          three: "skipped",
          "outside-this-roadmap": "done",
        },
      ),
    ).toEqual({
      learning: 1,
      done: 1,
      skipped: 1,
      completed: 2,
      total: 4,
    });
  });

  it("accepts only the public response shape and supported statuses", () => {
    expect(
      parseRoadmapProgressStates({
        states: [
          { lessonId: "cpp11-toolchain", status: "learning" },
          { lessonId: "cpp11-raii", status: "done" },
        ],
      }),
    ).toEqual({
      "cpp11-toolchain": "learning",
      "cpp11-raii": "done",
    });
    expect(
      parseRoadmapProgressStates({
        states: [{ lessonId: "cpp11-toolchain", status: "pending" }],
      }),
    ).toBeNull();
  });
});
