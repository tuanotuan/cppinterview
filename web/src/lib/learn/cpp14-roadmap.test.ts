import { readFileSync } from "node:fs";
import path from "node:path";

import manifestJson from "../../generated/content-manifest.json";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { contentManifestSchema } from "../content/schema";
import { buildCpp14Roadmap } from "./cpp14-roadmap";

const manifest = contentManifestSchema.parse(manifestJson);
const source = parseYaml(
  readFileSync(
    path.join(process.cwd(), "content", "roadmaps", "cpp14.yaml"),
    "utf8",
  ),
);

describe("C++14 roadmap", () => {
  it("contains the complete 50-day curriculum in seven ordered phases", () => {
    const roadmap = buildCpp14Roadmap(source, "vi", manifest.lessons);

    expect(roadmap.phases).toHaveLength(7);
    expect(roadmap.days).toHaveLength(50);
    expect(roadmap.days.map((entry) => entry.day)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
    expect(roadmap.phases.flatMap((phase) => phase.days)).toHaveLength(50);
  });

  it("only links published C++14 lessons and never creates dead links for planned days", () => {
    const roadmap = buildCpp14Roadmap(source, "vi", manifest.lessons);
    const cpp14LessonIds = new Set(
      manifest.lessons
        .filter((lesson) => lesson.track === "cpp14")
        .map((lesson) => lesson.id),
    );

    for (const entry of roadmap.days) {
      for (const lesson of entry.lessons) {
        expect(cpp14LessonIds.has(lesson.id)).toBe(true);
      }
      if (entry.coverage === "planned") {
        expect(entry.lessons).toEqual([]);
      } else {
        expect(entry.lessons.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps dependencies acyclic and earlier than the day that uses them", () => {
    const roadmap = buildCpp14Roadmap(source, "vi", manifest.lessons);

    for (const entry of roadmap.days) {
      expect(entry.dependsOn.every((dependency) => dependency < entry.day)).toBe(true);
    }
  });

  it("localizes roadmap-owned copy without changing linked lesson identity", () => {
    const vietnamese = buildCpp14Roadmap(source, "vi", manifest.lessons);
    const english = buildCpp14Roadmap(source, "en", manifest.lessons);

    expect(vietnamese.days[0].title).toBe(
      "Toolchain, compiler flags và chế độ C++14",
    );
    expect(english.days[0].title).toBe(
      "Toolchain, Compiler Flags, and C++14 Mode",
    );
    expect(english.days[0].lessons.map((lesson) => lesson.id)).toEqual(
      vietnamese.days[0].lessons.map((lesson) => lesson.id),
    );
  });

  it("reports readiness as content coverage rather than learner progress", () => {
    const roadmap = buildCpp14Roadmap(source, "en", manifest.lessons);
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
