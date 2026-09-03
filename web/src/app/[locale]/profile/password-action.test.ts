import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("profile password action", () => {
  it("shows change-password copy only when the account already has a password", async () => {
    const source = await readFile(path.join(import.meta.dirname, "page.tsx"), "utf8");

    expect(source).toContain("account.hasPassword");
    expect(source).toContain('label: "Đổi mật khẩu"');
    expect(source).toContain('label: "Đặt mật khẩu"');
    expect(source).toContain("{passwordAction.description}");
    expect(source).toContain("{passwordAction.label}");
  });
});
