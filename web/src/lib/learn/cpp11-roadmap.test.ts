import { readFileSync } from "node:fs";
import path from "node:path";

import manifestJson from "../../generated/content-manifest.json";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { contentManifestSchema } from "../content/schema";
import { buildCpp11Roadmap } from "./cpp11-roadmap";

const manifest = contentManifestSchema.parse(manifestJson);
const source = parseYaml(
  readFileSync(
    path.join(process.cwd(), "content", "roadmaps", "cpp11.yaml"),
    "utf8",
  ),
);

describe("C++11 roadmap", () => {
  it("contains the approved 53-day curriculum in eight ordered phases", () => {
    const roadmap = buildCpp11Roadmap(source, "vi", manifest.lessons);

    expect(roadmap.phases).toHaveLength(8);
    expect(roadmap.days).toHaveLength(53);
    expect(roadmap.days.map((entry) => entry.day)).toEqual(
      Array.from({ length: 53 }, (_, index) => index + 1),
    );
    expect(roadmap.phases.flatMap((phase) => phase.days)).toHaveLength(53);
  });

  it("only links published C++11 lessons and never creates dead links for planned days", () => {
    const roadmap = buildCpp11Roadmap(source, "vi", manifest.lessons);
    const cpp11LessonIds = new Set(
      manifest.lessons
        .filter((lesson) => lesson.track === "cpp11")
        .map((lesson) => lesson.id),
    );

    for (const entry of roadmap.days) {
      for (const lesson of entry.lessons) {
        expect(cpp11LessonIds.has(lesson.id)).toBe(true);
      }
      if (entry.coverage === "planned") {
        expect(entry.lessons).toEqual([]);
      } else {
        expect(entry.lessons.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps dependencies acyclic and earlier than the day that uses them", () => {
    const roadmap = buildCpp11Roadmap(source, "vi", manifest.lessons);

    for (const entry of roadmap.days) {
      expect(entry.dependsOn.every((dependency) => dependency < entry.day)).toBe(true);
    }
  });

  it("localizes roadmap-owned copy without changing linked lesson identity", () => {
    const vietnamese = buildCpp11Roadmap(source, "vi", manifest.lessons);
    const english = buildCpp11Roadmap(source, "en", manifest.lessons);

    expect(vietnamese.days[0].title).toBe(
      "Toolchain, compiler flags và chế độ C++11",
    );
    expect(english.days[0].title).toBe(
      "Toolchain, compiler flags, and C++11 mode",
    );
    expect(english.days[0].lessons.map((lesson) => lesson.id)).toEqual(
      vietnamese.days[0].lessons.map((lesson) => lesson.id),
    );
  });

  it("reports readiness as content coverage rather than learner progress", () => {
    const roadmap = buildCpp11Roadmap(source, "en", manifest.lessons);
    const total = Object.values(roadmap.coverageCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    expect(total).toBe(53);
    expect(roadmap.coverageCounts).toEqual({
      ready: 53,
      partial: 0,
      planned: 0,
    });
  });
});
