import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { findRepoRoot } from "./loader";

type WorkflowStep = {
  run?: string;
};

type WorkflowJob = {
  if?: string;
  permissions?: {
    contents?: string;
  };
  steps?: WorkflowStep[];
};

type Workflow = {
  permissions?: {
    contents?: string;
  };
  jobs?: Record<string, WorkflowJob>;
};

const EXTERNAL_MUTATION_MARKERS = [
  "git push",
  "npm run content:sync",
  "npm run content:generate:db",
];

describe("content workflow policy", () => {
  it("loads paid generation scripts through the React server condition", async () => {
    const repoRoot = await findRepoRoot(import.meta.dirname);
    const packageJson = JSON.parse(
      await readFile(path.join(repoRoot, "web", "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    for (const scriptName of [
      "content:draft",
      "content:auto",
      "content:generate:db",
    ]) {
      expect(packageJson.scripts?.[scriptName]).toContain(
        "node --conditions=react-server --import tsx",
      );
    }
  });

  it("allows external content mutations only from the main branch", async () => {
    const repoRoot = await findRepoRoot(import.meta.dirname);
    const workflow = parseYaml(
      await readFile(
        path.join(repoRoot, ".github", "workflows", "web-validate.yml"),
        "utf8",
      ),
    ) as Workflow;
    expect(workflow.permissions?.contents).toBe("read");
    const jobs = Object.entries(workflow.jobs ?? {});
    const mutatingJobs = jobs.filter(([, job]) =>
      job.steps?.some((step) =>
        EXTERNAL_MUTATION_MARKERS.some((marker) =>
          step.run?.includes(marker),
        ),
      ),
    );

    expect(mutatingJobs.length).toBeGreaterThan(0);
    for (const [jobName, job] of mutatingJobs) {
      expect(
        job.if,
        `${jobName} must be restricted to refs/heads/main`,
      ).toContain("github.ref == 'refs/heads/main'");
      expect(
        job.permissions?.contents,
        `${jobName} is the only job allowed to push repository content`,
      ).toBe("write");
    }
    for (const [jobName, job] of jobs) {
      if (mutatingJobs.some(([name]) => name === jobName)) continue;
      expect(
        job.permissions?.contents,
        `${jobName} must not receive a write-capable repository token`,
      ).not.toBe("write");
    }
  });
});
