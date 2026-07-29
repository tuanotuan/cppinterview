import { describe, expect, it } from "vitest";

import {
  TICK_DATA_GUIDE_CHAPTERS,
  TICK_DATA_GUIDE_SOURCES,
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
});
