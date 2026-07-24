import { describe, expect, it } from "vitest";

import manifest from "../../generated/content-manifest.json";
import {
  TICK_DATA_GUIDE_CHAPTERS,
  TICK_DATA_GUIDE_SOURCES,
  TICK_DATA_REPO_LESSONS,
} from "./tick-data-guide";

describe("tick data learning guide", () => {
  it("keeps stable, unique chapter anchors", () => {
    const ids = TICK_DATA_GUIDE_CHAPTERS.map((chapter) => chapter.id);

    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true);
  });

  it("uses primary HTTPS references", () => {
    expect(TICK_DATA_GUIDE_SOURCES.length).toBeGreaterThanOrEqual(6);
    expect(
      TICK_DATA_GUIDE_SOURCES.every((source) =>
        source.href.startsWith("https://"),
      ),
    ).toBe(true);
    expect(
      TICK_DATA_GUIDE_SOURCES.every(
        (source) =>
          source.href.includes("nasdaqtrader.com") ||
          source.href.includes("cmegroupclientsite.atlassian.net") ||
          source.href.includes("nyse.com"),
      ),
    ).toBe(true);
  });

  it("links every source lesson used to generate the queue", () => {
    const manifestLessonIds = new Set(manifest.lessons.map((lesson) => lesson.id));

    expect(TICK_DATA_REPO_LESSONS).toHaveLength(5);
    expect(
      TICK_DATA_REPO_LESSONS.every((lesson) =>
        manifestLessonIds.has(lesson.lessonId),
      ),
    ).toBe(true);
    expect(
      TICK_DATA_REPO_LESSONS.every((lesson) =>
        lesson.href.includes("/modern-cpp-features/blob/main/"),
      ),
    ).toBe(true);
  });
});
