import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase",
  "migrations",
  "20260831105819_publish_general_cpp_mock_interview.sql",
);

describe("general C++ mock interview publication migration", () => {
  it("keeps editorial approval writes admin-only at the RLS boundary", async () => {
    const sql = (await readFile(migrationPath, "utf8")).replaceAll(
      "\r\n",
      "\n",
    );

    expect(sql).toContain(
      'create policy "Content admins insert their own question approvals"',
    );
    expect(sql).toContain(
      'create policy "Content admins update their own question approvals"',
    );
    expect(sql).toContain(
      'create policy "Content admins delete their own question approvals"',
    );
    expect(sql.match(/\(select public\.is_content_admin\(\)\)/g)).toHaveLength(
      4,
    );
    expect(sql).toMatch(/with check \([\s\S]*?auth\.uid\(\)[\s\S]*?is_content_admin/);
    expect(sql).toMatch(/using \([\s\S]*?auth\.uid\(\)[\s\S]*?is_content_admin/);
    expect(sql).not.toMatch(/grant .*question_approvals.*anon/i);
  });
});
