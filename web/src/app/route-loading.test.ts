import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Route loading UI", () => {
  it("shows an accessible animated loading state without shifting the page shell", async () => {
    const [loadingSource, globalStyles] = await Promise.all([
      readFile(
        path.resolve(import.meta.dirname, "[locale]", "loading.tsx"),
        "utf8",
      ),
      readFile(path.resolve(import.meta.dirname, "globals.css"), "utf8"),
    ]);

    expect(loadingSource).toContain('aria-busy="true"');
    expect(loadingSource).toContain('role="status"');
    expect(loadingSource).toContain("ui-route-loading-track");
    expect(loadingSource).toContain("ui-route-loading-progress");
    expect(loadingSource).toContain("ui-route-loading-shimmer");
    expect(loadingSource).toContain(
      'className="flex w-full items-center gap-2 sm:w-auto"',
    );
    expect(loadingSource).not.toContain("animate-pulse");

    expect(globalStyles).toContain("@keyframes route-loading-progress");
    expect(globalStyles).toContain("@keyframes route-loading-shimmer");
    expect(globalStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ui-route-loading-progress[\s\S]*animation: none !important;/,
    );
    expect(globalStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ui-route-loading-shimmer::after[\s\S]*animation: none !important;/,
    );
  });
});
