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

  it("uses the three Anki-style daily buckets without changing detailed states", async () => {
    const practiceApp = await readFile(
      path.resolve(import.meta.dirname, "practice-app.tsx"),
      "utf8",
    );

    expect(vietnameseMessages.Practice.progressPanel).toMatchObject({
      new: "Mới",
      learning: "Đang học",
      due: "Đến hạn",
    });
    expect(englishMessages.Practice.progressPanel).toMatchObject({
      new: "New",
      learning: "Learning",
      due: "Due",
    });
    expect(practiceApp).toContain('practiceT("progressPanel.dailyStatus"');
    expect(practiceApp).not.toContain("value={learningCounts.");
    expect(vietnameseMessages.Practice.learningState).toHaveProperty(
      "relearning",
      "Học lại",
    );
  });

  it("uses Anki rating semantics with FSRS-computed intervals", async () => {
    const practiceApp = await readFile(
      path.resolve(import.meta.dirname, "practice-app.tsx"),
      "utf8",
    );

    expect(vietnameseMessages.Practice.rating).toMatchObject({
      again: "Quên",
      hard: "Nhớ nhưng khó",
      good: "Tốt",
      easy: "Dễ",
    });
    expect(englishMessages.Practice.rating).toMatchObject({
      again: "Again",
      hard: "Hard",
      good: "Good",
      easy: "Easy",
    });
    expect(vietnameseMessages.Practice.rating).not.toHaveProperty("oneDay");
    expect(englishMessages.Practice.rating).not.toHaveProperty("sevenDays");
    expect(practiceApp).toContain("previewQuestionRatingIntervals");
    expect(practiceApp).toContain("currentRatingIntervals[option.value]");
    expect(practiceApp).not.toContain("ratingIntervalDays");
  });

  it("does not render redundant sync and source metadata below Practice", async () => {
    const practiceApp = await readFile(
      path.resolve(import.meta.dirname, "practice-app.tsx"),
      "utf8",
    );

    expect(practiceApp).not.toContain('practiceT("footer.');
    expect(englishMessages.Practice).not.toHaveProperty("footer");
    expect(vietnameseMessages.Practice).not.toHaveProperty("footer");
  });

  it("does not render redundant autosave and blank-answer helper copy", async () => {
    const practiceApp = await readFile(
      path.resolve(import.meta.dirname, "practice-app.tsx"),
      "utf8",
    );

    expect(practiceApp).not.toContain('practiceT("question.autosaved")');
    expect(practiceApp).not.toContain('practiceT("question.blankHelp")');
    expect(englishMessages.Practice.question).not.toHaveProperty("autosaved");
    expect(englishMessages.Practice.question).not.toHaveProperty("blankHelp");
    expect(vietnameseMessages.Practice.question).not.toHaveProperty("autosaved");
    expect(vietnameseMessages.Practice.question).not.toHaveProperty("blankHelp");
  });

  it("keeps untranslated canonical questions out of the English deck", async () => {
    const pageSource = await readFile(
      path.resolve(import.meta.dirname, "[locale]", "practice", "page.tsx"),
      "utf8",
    );
    expect(pageSource).toMatch(
      /hasExactQuestionTranslation\(\s*question,\s*locale,\s*questionTranslations,/,
    );
    expect(pageSource).toContain("loadPublishedQuestionBank(locale)");
    expect(pageSource).toContain(": publishedBank.manifest");
    expect(pageSource).toContain(": publishedBank.translations");
  });

  it("localizes the scenario editor scaffold instead of leaking Vietnamese", () => {
    const editor = scenarioEditorConfig("cpp", "en");

    expect(editor.template).toContain("Design the public API here");
    expect(editor.placeholder).toContain("Design your class/API here");
    expect(editor.template).not.toContain("Thiết kế");
  });
});
