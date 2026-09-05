import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  findRepoRoot,
  loadContentManifest,
  loadEnglishLessonTranslationCatalog,
} from "../src/lib/content/loader";

type InterviewQuestionSourceCatalog = {
  questions: Array<{
    number: number;
    prompt: { en: string };
  }>;
};

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
  const interviewQuestionSourcePath = path.join(
    webRoot,
    "content",
    "daily-cpp-interview-source.json",
  );
  const interviewQuestionIndexPath = path.join(
    webRoot,
    "content",
    "real-world-cpp-interview-questions.json",
  );
  const manifest = await loadContentManifest(repoRoot, webRoot);
  const translations = await loadEnglishLessonTranslationCatalog(
    repoRoot,
    manifest,
  );
  const interviewQuestionSource = JSON.parse(
    await readFile(interviewQuestionSourcePath, "utf8"),
  ) as InterviewQuestionSourceCatalog;
  const interviewQuestionIndex = {
    schemaVersion: 1,
    questions: interviewQuestionSource.questions.map((question) => ({
      id: `dailycpp-q${String(question.number).padStart(3, "0")}`,
      prompt: question.prompt.en,
    })),
  };
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const serializedTranslations = `${JSON.stringify(translations, null, 2)}\n`;
  const serializedInterviewQuestionIndex =
    `${JSON.stringify(interviewQuestionIndex, null, 2)}\n`;

  if (process.argv.includes("--check")) {
    let current = "";
    let currentTranslations = "";
    let currentInterviewQuestionIndex = "";
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
    try {
      currentInterviewQuestionIndex = await readFile(
        interviewQuestionIndexPath,
        "utf8",
      );
    } catch {
      // The actionable error below also covers a missing question index.
    }

    if (
      normalizeNewlines(current) !== normalizeNewlines(serialized) ||
      normalizeNewlines(currentTranslations) !==
        normalizeNewlines(serializedTranslations) ||
      normalizeNewlines(currentInterviewQuestionIndex) !==
        normalizeNewlines(serializedInterviewQuestionIndex)
    ) {
      console.error("Content artifacts are stale. Run: npm run content:generate");
      process.exitCode = 1;
    } else {
      console.log("Content artifacts are up to date.");
    }
  } else {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
    await writeFile(translationOutputPath, serializedTranslations, "utf8");
    await writeFile(
      interviewQuestionIndexPath,
      serializedInterviewQuestionIndex,
      "utf8",
    );
    console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
    console.log(`Generated ${path.relative(repoRoot, translationOutputPath)}`);
    console.log(
      `Generated ${path.relative(repoRoot, interviewQuestionIndexPath)}`,
    );
  }
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
