import { describe, expect, it } from "vitest";

import { buildLessonReaderBlocks } from "./lesson-reader-layout";

describe("buildLessonReaderBlocks", () => {
  it("places sample code immediately after the simple-example section", () => {
    const sections = Array.from({ length: 10 }, (_, index) => `section-${index + 1}`);

    expect(buildLessonReaderBlocks(sections, true).map((block) => block.kind)).toEqual([
      "section",
      "section",
      "section",
      "section",
      "section",
      "section",
      "section",
      "section",
      "sample-code",
      "section",
      "section",
    ]);
  });

  it("omits the sample-code block when the lesson has no code", () => {
    expect(buildLessonReaderBlocks(["one", "two"], false)).toEqual([
      { kind: "section", section: "one", sectionIndex: 0 },
      { kind: "section", section: "two", sectionIndex: 1 },
    ]);
  });
});
