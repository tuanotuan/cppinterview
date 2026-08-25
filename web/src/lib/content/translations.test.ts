import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";

import { contentManifestSchema } from "./schema";
import {
  contentTranslationCoverage,
  localizeContentManifest,
} from "./translations";

describe("content translations", () => {
  const manifest = contentManifestSchema.parse(manifestJson);

  it("changes display copy without changing stable learning identity", () => {
    const source = manifest;
    const localized = localizeContentManifest(source, "en");
    const sourceQuestion = source.questions.find(
      (question) => question.id === "cpp11-auto-001",
    )!;
    const translatedQuestion = localized.questions.find(
      (question) => question.id === sourceQuestion.id,
    )!;

    expect(translatedQuestion.prompt).toContain("difference");
    expect(translatedQuestion.prompt).not.toBe(sourceQuestion.prompt);
    expect({
      id: translatedQuestion.id,
      version: translatedQuestion.version,
      sourceHash: translatedQuestion.sourceHash,
      taxonomy: translatedQuestion.taxonomy,
      sources: translatedQuestion.sources,
      code: translatedQuestion.code,
    }).toEqual({
      id: sourceQuestion.id,
      version: sourceQuestion.version,
      sourceHash: sourceQuestion.sourceHash,
      taxonomy: sourceQuestion.taxonomy,
      sources: sourceQuestion.sources,
      code: sourceQuestion.code,
    });
  });

  it("reports exact-revision coverage", () => {
    const coverage = contentTranslationCoverage(
      manifest,
      "en",
    );
    expect(coverage.questions).toBe(10);
  });
});
