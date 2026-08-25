import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import englishMessages from "@/messages/en.json";
import vietnameseMessages from "@/messages/vi.json";
import { scenarioEditorConfig } from "@/lib/practice/scenario-editor";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("Practice localization", () => {
  it("keeps the English and Vietnamese Practice message contracts aligned", () => {
    expect(leafKeys(englishMessages.Practice).sort()).toEqual(
      leafKeys(vietnameseMessages.Practice).sort(),
    );
  });

  it("does not leave the reported English Practice hero in Vietnamese", () => {
    expect(englishMessages.Practice.today).toMatchObject({
      eyebrow: "Today's study space",
      ready: "Ready for the next question?",
      progress: "Today's progress",
      studied: "Studied",
      remainingMetric: "Remaining",
      streak: "Streak",
    });
  });

  it("keeps untranslated canonical questions out of the English deck", async () => {
    const pageSource = await readFile(
      path.resolve(import.meta.dirname, "[locale]", "practice", "page.tsx"),
      "utf8",
    );
    expect(pageSource).toContain(
      'locale === "vi" || hasExactQuestionTranslation(question, locale)',
    );
  });

  it("localizes the scenario editor scaffold instead of leaking Vietnamese", () => {
    const editor = scenarioEditorConfig("cpp", "en");

    expect(editor.template).toContain("Design the public API here");
    expect(editor.placeholder).toContain("Design your class/API here");
    expect(editor.template).not.toContain("Thiết kế");
  });
});
