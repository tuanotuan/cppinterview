import { readFile } from "node:fs/promises";
import path from "node:path";

import { toString } from "mdast-util-to-string";
import { describe, expect, it } from "vitest";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import remarkParse from "remark-parse";

import { findRepoRoot } from "./loader";

const EXPECTED_HEADINGS = [
  { depth: 1, text: "Day [SỐ NGÀY] — [ENGLISH TOPIC TITLE]" },
  { depth: 2, text: "1. Problem It Solves" },
  { depth: 2, text: "2. Prerequisites" },
  { depth: 2, text: "3. Core Idea" },
  { depth: 2, text: "4. Minimal Syntax" },
  { depth: 2, text: "5. How It Works" },
  { depth: 2, text: "6. Common Mistakes" },
  { depth: 2, text: "7. When to Use It" },
  { depth: 2, text: "8. Trading Use Case" },
  { depth: 2, text: "9. Key Takeaways" },
  { depth: 2, text: "10. Self-Check Questions" },
  { depth: 2, text: "11. Small Exercise" },
] as const;

describe("daily C++ lesson prompt", () => {
  it("contains a parseable, exact Markdown lesson skeleton", async () => {
    const repoRoot = await findRepoRoot(import.meta.dirname);
    const prompt = await readFile(
      path.join(repoRoot, "docs", "prompts", "cpp-daily-lesson.md"),
      "utf8",
    );
    const skeleton = /~~~markdown\r?\n([\s\S]*?)\r?\n~~~/u.exec(prompt)?.[1];

    expect(skeleton).toBeDefined();
    const tree = unified().use(remarkParse).parse(skeleton);
    const headings: Array<{ depth: number; text: string }> = [];
    const codeBlocks: Array<{ lang: string | null | undefined; value: string }> =
      [];
    visit(tree, "heading", (node) => {
      headings.push({ depth: node.depth, text: toString(node) });
    });
    visit(tree, "code", (node) => {
      codeBlocks.push({ lang: node.lang, value: node.value });
    });

    expect(headings).toEqual(EXPECTED_HEADINGS);
    expect(codeBlocks).toEqual([
      {
        lang: "cpp",
        value: "// Only the smallest syntax fragment needed for this topic.",
      },
    ]);
  });

  it("keeps download and repository output modes unambiguous", async () => {
    const repoRoot = await findRepoRoot(import.meta.dirname);
    const prompt = await readFile(
      path.join(repoRoot, "docs", "prompts", "cpp-daily-lesson.md"),
      "utf8",
    );

    expect(prompt).toContain("day_[SỐ NGÀY]_[topic_slug].cpp");
    expect(prompt).toContain("day_[SỐ NGÀY]_[topic_slug].md");
    expect(prompt).toContain(
      "[THƯ MỤC GỐC]/[SỐ NGÀY]_[topic_slug]/",
    );
    expect(prompt).toContain(
      "Hai tệp bài học phải là `main.cpp` và `knowledge.md`.",
    );
    expect(prompt).toContain("npm run content:refresh");
    expect(prompt).toContain("npm run context:check");
    expect(prompt).toContain("npm run validate");
    expect(prompt).toContain("Không push trực tiếp lên `main`.");
  });
});
