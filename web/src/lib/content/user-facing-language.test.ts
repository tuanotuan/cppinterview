import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifestJson from "../../generated/content-manifest.json";
import { contentManifestSchema } from "./schema";
import {
  hasTaxonomyTopicLabel,
  questionDifficultyLabels,
  questionResponseModeLabels,
} from "./user-facing-labels";

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, "..");
const textExtensions = new Set([".md", ".ts", ".tsx", ".yaml", ".yml"]);

describe("user-facing language", () => {
  it("does not address learners with informal mày/tao pronouns", () => {
    const files = [
      ...walk(path.join(webRoot, "src", "app")),
      ...walk(path.join(webRoot, "src", "lib")),
      ...walk(path.join(webRoot, "content", "questions")),
      ...walk(path.join(repoRoot, "cmake")),
      ...walk(path.join(repoRoot, "cpp98_foundation")),
      ...walk(path.join(repoRoot, "cpp11")),
      ...walk(path.join(repoRoot, "cpp20")),
      ...walk(path.join(repoRoot, "python")),
    ];
    const informalPronoun = new RegExp(
      String.raw`(^|[^\p{L}])(mày|tao|tụi mày)(?=$|[^\p{L}])`,
      "giu",
    );

    expect(findMatches(files, [informalPronoun])).toEqual([]);
  });

  it("keeps recurring product labels in clear Vietnamese", () => {
    const appFiles = walk(path.join(webRoot, "src", "app")).filter((file) =>
      file.endsWith(".tsx"),
    );
    const discouragedLabels = [
      /Primary gap/g,
      /Content gap/g,
      /Readiness Hub/g,
      /Guided Mode/g,
      /Focus Sprint/g,
      /AI Rescue/g,
      /AI model/g,
      /Mock interview/g,
      /Interview practice/g,
      /Cloud progress/g,
      /local only/g,
      /Luna hỗ trợ tối đa 3 lượt AI trong 24 giờ/g,
      /Trung tâm sẵn sàng/g,
      /Phân tích code/g,
      /Code mẫu/g,
      /["'](?:Advanced|Checkpoint|Feedback|Rubric)["']/g,
      />\s*(?:Advanced|Checkpoint|Feedback|Rubric)\s*</g,
    ];

    expect(findMatches(appFiles, discouragedLabels)).toEqual([]);
  });

  it("has a Vietnamese label for every current taxonomy topic", () => {
    const manifest = contentManifestSchema.parse(manifestJson);
    const topics = [
      ...new Set(
        manifest.questions.flatMap((question) => question.taxonomy.topics),
      ),
    ];

    expect(topics.filter((topic) => !hasTaxonomyTopicLabel(topic))).toEqual([]);
  });

  it("uses the two compact question labels shown in the learner UI", () => {
    expect(questionDifficultyLabels).toEqual({
      beginner: "Dễ",
      intermediate: "Trung bình",
      advanced: "Khó",
    });
    expect(questionResponseModeLabels).toEqual({
      text: "Text",
      code: "Code",
    });
  });
});

function walk(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (["generated", "node_modules"].includes(entry.name)) return [];
      return walk(absolutePath);
    }
    if (
      !entry.isFile() ||
      entry.name.includes(".test.") ||
      !textExtensions.has(path.extname(entry.name))
    ) {
      return [];
    }
    return [absolutePath];
  });
}

function findMatches(files: string[], patterns: RegExp[]) {
  return files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return patterns.flatMap((pattern) => {
      pattern.lastIndex = 0;
      return [...source.matchAll(pattern)].map((match) => ({
        file: path.relative(repoRoot, file).replaceAll("\\", "/"),
        line: source.slice(0, match.index ?? 0).split("\n").length,
        text: match[0],
      }));
    });
  });
}
