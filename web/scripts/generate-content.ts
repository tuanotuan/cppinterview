import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  findRepoRoot,
  loadContentManifest,
  loadEnglishLessonTranslationCatalog,
} from "../src/lib/content/loader";

async function main() {
  const webRoot = path.resolve(import.meta.dirname, "..");
  const repoRoot = await findRepoRoot(webRoot);
  const outputPath = path.join(
    webRoot,
    "src",
    "generated",
    "content-manifest.json",
  );
  const translationOutputPath = path.join(
    webRoot,
    "src",
    "generated",
    "lesson-translations-en.json",
  );
  const manifest = await loadContentManifest(repoRoot, webRoot);
  const translations = await loadEnglishLessonTranslationCatalog(
    repoRoot,
    manifest,
  );
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const serializedTranslations = `${JSON.stringify(translations, null, 2)}\n`;

  if (process.argv.includes("--check")) {
    let current = "";
    let currentTranslations = "";
    try {
      current = await readFile(outputPath, "utf8");
    } catch {
      // The actionable error below also covers a missing manifest.
    }
    try {
      currentTranslations = await readFile(translationOutputPath, "utf8");
    } catch {
      // The actionable error below also covers a missing translation artifact.
    }

    if (
      normalizeNewlines(current) !== normalizeNewlines(serialized) ||
      normalizeNewlines(currentTranslations) !==
        normalizeNewlines(serializedTranslations)
    ) {
      console.error("Content artifacts are stale. Run: npm run content:generate");
      process.exitCode = 1;
    } else {
      console.log("Content manifest is up to date.");
    }
  } else {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
    await writeFile(translationOutputPath, serializedTranslations, "utf8");
    console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
    console.log(`Generated ${path.relative(repoRoot, translationOutputPath)}`);
  }
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
