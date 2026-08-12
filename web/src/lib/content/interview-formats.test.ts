import { describe, expect, it } from "vitest";

import {
  categoryForInterviewFormat,
  draftFormatsForCategories,
} from "./interview-formats";

describe("interview exercise formats", () => {
  it("keeps undefined behavior and code review in their intended assessment buckets", () => {
    expect(categoryForInterviewFormat("undefined_behavior")).toBe(
      "code_reading_ub",
    );
    expect(categoryForInterviewFormat("code_review")).toBe(
      "code_review_debug",
    );
  });

  it("plans code-review/debug formats when that coverage bucket is requested", () => {
    expect(
      draftFormatsForCategories(["code_review_debug"], 4),
    ).toEqual([
      "bug_hunt",
      "crash_memory_leak",
      "api_class_review",
      "compiler_diagnostic",
    ]);
  });
});
