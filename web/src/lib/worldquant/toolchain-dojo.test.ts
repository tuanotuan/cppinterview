import { describe, expect, it } from "vitest";

import { gradeToolchainProject, toolchainProjects } from "./toolchain-dojo";

describe("toolchain dojo", () => {
  it("accepts each canonical target-based solution", () => {
    for (const project of toolchainProjects) {
      const selections = Object.fromEntries(
        project.checks.map((check) => [check.id, check.expectedOptionId]),
      );
      expect(gradeToolchainProject(project.id, selections).passed).toBe(true);
    }
  });

  it("rejects a global compiler flag anti-pattern", () => {
    const result = gradeToolchainProject("toolchain-target-scope", {
      standard: "flags",
      warnings: "directory",
    });
    expect(result.passed).toBe(false);
    expect(result.checks.map((check) => check.passed)).toEqual([false, false]);
  });

  it("keeps grading independent from object key order", () => {
    const project = toolchainProjects[0];
    const first = gradeToolchainProject(project.id, {
      standard: "target",
      warnings: "private",
    });
    const second = gradeToolchainProject(project.id, {
      warnings: "private",
      standard: "target",
    });
    expect(second).toEqual(first);
  });
});
