import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

type PackageLock = {
  packages?: Record<string, { version?: string }>;
};

describe("production dependency security pins", () => {
  it("keeps patched DOMPurify and sharp releases in the lockfile", async () => {
    const lock = JSON.parse(
      await readFile(
        path.resolve(import.meta.dirname, "..", "..", "package-lock.json"),
        "utf8",
      ),
    ) as PackageLock;

    expect(
      versionAtLeast(
        lock.packages?.["node_modules/dompurify"]?.version,
        "3.4.12",
      ),
    ).toBe(true);
    expect(
      versionAtLeast(
        lock.packages?.["node_modules/sharp"]?.version,
        "0.35.3",
      ),
    ).toBe(true);
  });
});

function versionAtLeast(actual: string | undefined, minimum: string) {
  if (!actual) return false;
  const actualParts = numericVersion(actual);
  const minimumParts = numericVersion(minimum);
  for (let index = 0; index < 3; index += 1) {
    const difference = actualParts[index] - minimumParts[index];
    if (difference !== 0) return difference > 0;
  }
  return true;
}

function numericVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return [-1, -1, -1];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
