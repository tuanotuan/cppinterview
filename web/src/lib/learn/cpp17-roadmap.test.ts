import { readFileSync } from "node:fs";
import path from "node:path";

import manifestJson from "../../generated/content-manifest.json";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { contentManifestSchema } from "../content/schema";
import { buildCpp17Roadmap } from "./cpp17-roadmap";

const manifest = contentManifestSchema.parse(manifestJson);
const source = parseYaml(
  readFileSync(
    path.join(process.cwd(), "content", "roadmaps", "cpp17.yaml"),
    "utf8",
  ),
);

describe("C++17 roadmap", () => {
  it("contains the complete 50-day curriculum in seven ordered phases", () => {
    const roadmap = buildCpp17Roadmap(source, "vi", manifest.lessons);

    expect(roadmap.phases).toHaveLength(7);
    expect(roadmap.days).toHaveLength(50);
    expect(roadmap.days.map((entry) => entry.day)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
    expect(roadmap.phases.flatMap((phase) => phase.days)).toHaveLength(50);
  });

  it("only links published C++17 lessons and never creates dead links for planned days", () => {
    const roadmap = buildCpp17Roadmap(source, "vi", manifest.lessons);
    const cpp17LessonIds = new Set(
      manifest.lessons
        .filter((lesson) => lesson.track === "cpp17")
        .map((lesson) => lesson.id),
    );

    for (const entry of roadmap.days) {
      for (const lesson of entry.lessons) {
        expect(cpp17LessonIds.has(lesson.id)).toBe(true);
      }
      if (entry.coverage === "planned") {
        expect(entry.lessons).toEqual([]);
      } else {
        expect(entry.lessons.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps dependencies acyclic and earlier than the day that uses them", () => {
    const roadmap = buildCpp17Roadmap(source, "vi", manifest.lessons);

    for (const entry of roadmap.days) {
      expect(entry.dependsOn.every((dependency) => dependency < entry.day)).toBe(true);
    }
  });

  it("localizes roadmap-owned copy without changing linked lesson identity", () => {
    const vietnamese = buildCpp17Roadmap(source, "vi", manifest.lessons);
    const english = buildCpp17Roadmap(source, "en", manifest.lessons);

    expect(vietnamese.days[0].title).toBe(
      "Toolchain, compiler flags và chế độ C++17",
    );
    expect(english.days[0].title).toBe(
      "Toolchain, Compiler Flags, and C++17 Mode",
    );
    expect(english.days[0].lessons.map((lesson) => lesson.id)).toEqual(
      vietnamese.days[0].lessons.map((lesson) => lesson.id),
    );
  });

  it("reports readiness as content coverage rather than learner progress", () => {
    const roadmap = buildCpp17Roadmap(source, "en", manifest.lessons);
    const total = Object.values(roadmap.coverageCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    expect(total).toBe(50);
    expect(roadmap.coverageCounts).toEqual({
      ready: 50,
      partial: 0,
      planned: 0,
    });
  });
});
