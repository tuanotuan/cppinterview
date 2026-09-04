import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260904092827_add_daily_cpp_content_track.sql",
  ),
  "utf8",
).toLowerCase();

describe("Real-World C++ Interviews content-track migration", () => {
  it("extends every current lesson standard and track constraint", () => {
    for (const replacement of [
      "content_lesson_revisions_standard_dailycpp_check",
      "content_lesson_revisions_track_dailycpp_check",
      "content_lessons_current_standard_dailycpp_check",
      "content_lessons_current_track_dailycpp_check",
    ]) {
      const declaration = migration.slice(migration.indexOf(replacement));
      expect(declaration).toContain("cpp23");
      expect(declaration).toContain("dailycpp");
      expect(declaration).toContain("not valid");
      expect(migration).toContain(`validate constraint ${replacement}`);
    }
  });

  it("validates replacements before removing the existing constraints", () => {
    expect(migration.indexOf("validate constraint")).toBeLessThan(
      migration.indexOf("drop constraint content_lesson_revisions_standard_check"),
    );
    expect(migration.lastIndexOf("validate constraint")).toBeLessThan(
      migration.indexOf("drop constraint content_lessons_current_standard_check"),
    );
  });

  it("does not change data access, RLS, functions, or table contents", () => {
    expect(migration).not.toMatch(/\b(?:insert|update|delete|truncate)\b/u);
    expect(migration).not.toMatch(/\b(?:grant|revoke|policy|function)\b/u);
    expect(migration).not.toContain("security definer");
  });
});

