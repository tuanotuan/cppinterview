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
  "20260818090000_allow_authenticated_content_store_state.sql",
);

describe("authenticated content-store access migration", () => {
  it("lets signed-in learners read only immutable store metadata", async () => {
    const sql = (await readFile(migrationPath, "utf8")).replaceAll("\r\n", "\n");

    expect(sql).toContain(
      'create policy "Authenticated users read content store state"',
    );
    expect(sql).toMatch(
      /on public\.content_store_state for select to authenticated\s+using \(true\);/,
    );
    expect(sql).toContain(
      "revoke all on table public.content_store_state from public, anon, authenticated;",
    );
    expect(sql).toContain(
      "grant select on table public.content_store_state to authenticated;",
    );
    expect(sql).not.toMatch(/for (?:insert|update|delete)/);
  });
});
