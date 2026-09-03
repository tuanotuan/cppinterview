import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
  "20260903102303_create_roadmap_lesson_progress.sql",
);

describe("roadmap lesson progress migration", () => {
  it("keeps roadmap state separate from Anki and owner-private", async () => {
    const sql = (await readFile(migrationPath, "utf8")).replaceAll(
      "\r\n",
      "\n",
    );

    expect(sql).toContain("create table public.user_roadmap_lesson_states");
    expect(sql).toContain("primary key (user_id, lesson_id)");
    expect(sql).toContain("references auth.users(id) on delete cascade");
    expect(sql).toContain("status in ('learning', 'done', 'skipped')");
    expect(sql).toContain(
      "alter table public.user_roadmap_lesson_states enable row level security",
    );
    expect(sql).toMatch(
      /revoke all on table public\.user_roadmap_lesson_states\s+from public, anon, authenticated;/,
    );
    expect(sql).toContain("as restrictive");
    expect(sql).toContain("(select auth.jwt()) ->> 'is_anonymous'");
    expect(sql.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(5);
    expect(sql).not.toContain("user_question_states");
    expect(sql).not.toContain("service_role");
  });
});
