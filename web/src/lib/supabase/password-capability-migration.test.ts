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
  "20260902154929_track_account_password_capability.sql",
);

describe("account password capability migration", () => {
  it("mirrors only the password capability and keeps reads owner-private", async () => {
    const sql = (await readFile(migrationPath, "utf8"))
      .replaceAll("\r\n", "\n")
      .toLowerCase();

    expect(sql).toContain("user_id uuid primary key references auth.users(id) on delete cascade");
    expect(sql).toContain("has_password boolean not null");
    expect(sql).not.toContain("encrypted_password text");
    expect(sql).toContain("alter table public.account_auth_capabilities enable row level security;");
    expect(sql).toContain('create policy "users read their own auth capabilities"');
    expect(sql).toMatch(
      /for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\);/,
    );
    expect(sql).toContain(
      "revoke all on table public.account_auth_capabilities\nfrom public, anon, authenticated;",
    );
    expect(sql).toContain(
      "grant select on table public.account_auth_capabilities to authenticated;",
    );
    expect(sql).not.toMatch(/grant\s+(?:insert|update|delete|all).*authenticated/);
  });

  it("backfills existing accounts and keeps the trigger function private", async () => {
    const sql = (await readFile(migrationPath, "utf8"))
      .replaceAll("\r\n", "\n")
      .toLowerCase();

    expect(sql).toContain("create schema if not exists private;");
    expect(sql).toContain("security definer\nset search_path = ''");
    expect(sql).toContain(
      "revoke execute on function private.sync_account_auth_capabilities()\nfrom public, anon, authenticated;",
    );
    expect(sql).toContain(
      "after insert or update of encrypted_password on auth.users",
    );
    expect(sql).toContain('from auth.users as "user"');
    expect(sql).toContain("coalesce(\"user\".encrypted_password, '') <> ''");
  });
});
