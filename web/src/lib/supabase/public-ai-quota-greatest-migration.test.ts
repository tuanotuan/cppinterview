import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const previousMigrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "20260829130024_add_lesson_ai_assistant.sql",
);
const fixMigrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "20260831171239_fix_public_ai_quota_greatest.sql",
);

describe("public AI quota GREATEST migration", () => {
  it("changes only the invalid schema qualification in the RPC body", async () => {
    const [previousSql, fixSql] = await Promise.all([
      readFile(previousMigrationPath, "utf8"),
      readFile(fixMigrationPath, "utf8"),
    ]);
    const previousFunction = extractQuotaFunction(previousSql);
    const fixedFunction = extractQuotaFunction(fixSql);

    expect(previousFunction.match(/pg_catalog\.greatest\(/g)).toHaveLength(2);
    expect(fixedFunction).toBe(
      previousFunction.replaceAll("pg_catalog.greatest(", "greatest("),
    );
    expect(fixedFunction).not.toContain("pg_catalog.greatest(");
    expect(fixedFunction.match(/'remaining', greatest\(/g)).toHaveLength(2);
  });

  it("preserves service-role-only execution", async () => {
    const sql = await readFile(fixMigrationPath, "utf8");

    expect(sql).toMatch(
      /revoke all on function public\.reserve_public_ai_quota\([\s\S]*?\) from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.reserve_public_ai_quota\([\s\S]*?\) to service_role;/,
    );
    expect(sql).not.toMatch(/grant execute[\s\S]*?to (?:public|anon|authenticated);/i);
  });
});

function extractQuotaFunction(sql: string) {
  const start = sql.indexOf(
    "create or replace function public.reserve_public_ai_quota(",
  );
  const endMarker = "\n$$;";
  const end = sql.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error("reserve_public_ai_quota definition is missing");
  }
  return sql.slice(start, end + endMarker.length).replaceAll("\r\n", "\n");
}
