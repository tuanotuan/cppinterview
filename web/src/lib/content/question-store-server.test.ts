import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  rowsToContentManifest,
  type LessonRow,
} from "./question-store-server";

describe("database question store", () => {
  it("ignores retired rows before validating their legacy standard", () => {
    const legacyLesson: LessonRow = {
      id: "retired-python-lesson",
      lifecycle_status: "active",
      source_hash: "legacy",
      source_commit_sha: null,
      source_path: "python/01_legacy",
      standard: "python3",
      language: "python",
      track: "python3",
      lesson_order: 1,
      title: "Retired lesson",
      tags: [],
      prerequisites: [],
      code: null,
      sections: [],
      checklist_items: [],
      manifest_order: 1,
    };

    expect(
      rowsToContentManifest([legacyLesson], [], "a".repeat(64)).lessons,
    ).toEqual([]);
  });
});
