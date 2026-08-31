import { readFileSync } from "node:fs";
import path from "node:path";

import manifestJson from "../../generated/content-manifest.json";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

import { contentManifestSchema } from "../content/schema";
import { buildCpp23Roadmap } from "./cpp23-roadmap";

const manifest = contentManifestSchema.parse(manifestJson);
const source = parseYaml(
  readFileSync(
    path.join(process.cwd(), "content", "roadmaps", "cpp23.yaml"),
    "utf8",
  ),
);

describe("C++23 roadmap", () => {
  it("contains the complete 54-day curriculum in eight ordered phases", () => {
    const roadmap = buildCpp23Roadmap(source, "vi", manifest.lessons);

    expect(roadmap.phases).toHaveLength(8);
    expect(roadmap.days).toHaveLength(54);
    expect(roadmap.days.map((entry) => entry.day)).toEqual(
      Array.from({ length: 54 }, (_, index) => index + 1),
    );
    expect(roadmap.phases.flatMap((phase) => phase.days)).toHaveLength(54);
  });

  it("only links published C++23 lessons and never creates dead links for planned days", () => {
    const roadmap = buildCpp23Roadmap(source, "vi", manifest.lessons);
    const cpp23LessonIds = new Set(
      manifest.lessons
        .filter((lesson) => lesson.track === "cpp23")
        .map((lesson) => lesson.id),
    );

    for (const entry of roadmap.days) {
      for (const lesson of entry.lessons) {
        expect(cpp23LessonIds.has(lesson.id)).toBe(true);
      }
      if (entry.coverage === "planned") {
        expect(entry.lessons).toEqual([]);
      } else {
        expect(entry.lessons.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps dependencies acyclic and earlier than the day that uses them", () => {
    const roadmap = buildCpp23Roadmap(source, "vi", manifest.lessons);

    for (const entry of roadmap.days) {
      expect(entry.dependsOn.every((dependency) => dependency < entry.day)).toBe(true);
    }
  });

  it("localizes roadmap-owned copy without changing linked lesson identity", () => {
    const vietnamese = buildCpp23Roadmap(source, "vi", manifest.lessons);
    const english = buildCpp23Roadmap(source, "en", manifest.lessons);

    expect(vietnamese.days[0].title).toBe("Toolchain và mức hỗ trợ C++23");
    expect(english.days[0].title).toBe("Toolchains and C++23 Support");
    expect(english.days[0].lessons.map((lesson) => lesson.id)).toEqual(
      vietnamese.days[0].lessons.map((lesson) => lesson.id),
    );
  });

  it("reports readiness as content coverage rather than learner progress", () => {
    const roadmap = buildCpp23Roadmap(source, "en", manifest.lessons);
    const total = Object.values(roadmap.coverageCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    expect(total).toBe(54);
    expect(roadmap.coverageCounts).toEqual({
      ready: 54,
      partial: 0,
      planned: 0,
    });
  });
});
