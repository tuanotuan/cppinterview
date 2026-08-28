import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "20260828064241_permanently_reject_queued_questions.sql",
);

describe("permanent queued-question rejection migration", () => {
  it("uses an admin-only tombstone and preserves append-only content history", async () => {
    const sql = (await readFile(migrationPath, "utf8")).replaceAll(
      "\r\n",
      "\n",
    );

    expect(sql).toContain("question_id text primary key");
    expect(sql).toContain("alter table public.content_question_rejections enable row level security");
    expect(sql).toMatch(
      /revoke all on table public\.content_question_rejections\s+from public, anon, authenticated;/,
    );
    expect(sql).not.toContain(
      "grant select on table public.content_question_rejections to authenticated",
    );
    expect(sql).toContain(
      "create or replace function public.list_rejected_content_question_ids()",
    );
    expect(sql).toMatch(
      /grant execute on function public\.list_rejected_content_question_ids\(\)\s+to authenticated, service_role;/,
    );
    expect(sql).toContain("security definer\nset search_path = ''");
    expect(sql).toContain("not (select public.is_content_admin())");
    expect(sql).toContain("mistake_candidates_rejected_materialized_idx");
    expect(sql).toContain("mistake_candidates_rejected_matched_idx");
    expect(sql.indexOf("from public.mistake_flashcard_candidates as candidate")).toBeLessThan(
      sql.indexOf("for update of question"),
    );
    expect(sql).toContain("for update of question");
    expect(sql).toContain("v_lifecycle_status = 'draft'");
    expect(sql).toContain("v_lesson_source_hash is distinct from v_revision_source_hash");
    expect(sql).toContain("approval.question_version = p_question_version");
    expect(sql).toContain("on conflict (question_id) do nothing");
    expect(sql).toContain("set status = 'dismissed'");
    expect(sql).toMatch(
      /grant execute on function public\.reject_queued_content_question\([\s\S]*?\) to authenticated, service_role;/,
    );
    expect(sql).not.toMatch(/delete from public\.content_question_(?:revisions|events)/);
    expect(sql).not.toContain("delete from public.content_questions");
  });
});
