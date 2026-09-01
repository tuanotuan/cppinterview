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
  "20260901004524_grant_mock_publication_reader.sql",
);

describe("mock interview publication reader migration", () => {
  it("grants the server reader only the SELECT privileges its invoker views need", async () => {
    const sql = (await readFile(migrationPath, "utf8"))
      .replaceAll("\r\n", "\n")
      .toLowerCase();
    const normalizedSql = sql.replace(/\s+/g, " ").trim();

    expect(sql).toContain("grant usage on schema public to service_role;");
    expect(normalizedSql).toContain(
      "grant select on table public.content_admins, public.question_approvals, public.content_store_state, public.content_lessons, public.content_lesson_revisions, public.content_questions, public.content_question_revisions, public.content_question_translations to service_role;",
    );
    expect(normalizedSql).toContain(
      "grant select on table public.content_current_lessons, public.content_current_questions, public.content_current_question_translations to service_role;",
    );
    expect(sql.match(/grant select on table/g)).toHaveLength(2);
    expect(sql).not.toMatch(
      /grant\s+(?:all|insert|update|delete|truncate|references|trigger)/,
    );
    expect(sql).not.toMatch(/\bto\s+(?:public|anon|authenticated)\b/);
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });
});
