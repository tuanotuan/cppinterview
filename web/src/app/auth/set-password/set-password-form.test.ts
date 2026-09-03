import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import englishMessages from "@/messages/en.json";
import vietnameseMessages from "@/messages/vi.json";

describe("set-password form", () => {
  it("keeps the form focused on the password fields without redundant provider copy", async () => {
    const source = await readFile(
      path.join(
        process.cwd(),
        "src",
        "app",
        "auth",
        "set-password",
        "set-password-form.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("setPassword.description");
    expect(vietnameseMessages.Auth.setPassword).not.toHaveProperty("description");
    expect(englishMessages.Auth.setPassword).not.toHaveProperty("description");
  });

  it("announces submission failures immediately", async () => {
    const source = await readFile(
      path.join(
        process.cwd(),
        "src",
        "app",
        "auth",
        "set-password",
        "set-password-form.tsx",
      ),
      "utf8",
    );

    expect(source).toContain('role={state.status === "error" ? "alert" : "status"}');
    expect(source).toContain('aria-atomic="true"');
  });

  it("switches from set-password to change-password copy after success", async () => {
    const source = await readFile(
      path.join(
        process.cwd(),
        "src",
        "app",
        "auth",
        "set-password",
        "set-password-form.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("initialHasPassword");
    expect(source).toContain('state.code === "passwordAdded"');
    expect(source).toContain('state.code === "passwordChanged"');
    expect(source).toContain('"setPassword.changeTitle"');
    expect(source).toContain('"setPassword.change"');
    expect(vietnameseMessages.Auth.actions.passwordAdded).toBe(
      "Đã thêm mật khẩu thành công.",
    );
    expect(vietnameseMessages.Auth.actions.passwordChanged).toBe(
      "Đã đổi mật khẩu thành công.",
    );
    expect(englishMessages.Auth.actions.passwordAdded).toBe(
      "Password added successfully.",
    );
    expect(englishMessages.Auth.actions.passwordChanged).toBe(
      "Password changed successfully.",
    );
  });
});
