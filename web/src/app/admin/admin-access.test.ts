import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = path.resolve(import.meta.dirname, "..");

describe("admin workspace access", () => {
  it("does not render admin pages or navigation for ordinary learners", async () => {
    const [adminPage, coveragePage, practiceApp] = await Promise.all([
      readFile(path.join(appRoot, "admin", "page.tsx"), "utf8"),
      readFile(path.join(appRoot, "admin", "coverage", "page.tsx"), "utf8"),
      readFile(path.join(appRoot, "practice-app.tsx"), "utf8"),
    ]);

    expect(adminPage).toContain("if (!cloud.canManageQuestionBank)");
    expect(adminPage).toContain('<AdminGate mode="restricted" />');
    expect(coveragePage).toContain("!cloud.canManageQuestionBank");
    expect(practiceApp).toContain(
      "canManageQuestionBank={canManageQuestionBank}",
    );
    expect(practiceApp.replaceAll("\r\n", "\n")).toContain(
      "{canManageQuestionBank ? (\n          <AdminHeaderLink>",
    );
  });

  it("keeps links to the unlocalized admin workspace outside locale routing", async () => {
    const [practiceApp, ...localizedAdminSources] = await Promise.all([
      readFile(path.join(appRoot, "practice-app.tsx"), "utf8"),
      readFile(path.join(appRoot, "[locale]", "stats", "page.tsx"), "utf8"),
      readFile(
        path.join(
          appRoot,
          "[locale]",
          "learn",
          "tick-data-order-book",
          "page.tsx",
        ),
        "utf8",
      ),
    ]);

    expect(practiceApp).toMatch(
      /function AdminHeaderLink[\s\S]*?<NextLink\s+href="\/admin"/,
    );

    for (const source of [practiceApp, ...localizedAdminSources]) {
      expect(source).not.toMatch(
        /<(?!NextLink\b)[A-Za-z][A-Za-z0-9]*\b[^>]*href="\/admin/,
      );
    }
  });
});
