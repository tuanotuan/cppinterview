import { describe, expect, it } from "vitest";

import { worldQuantRoleHref } from "./navigation";

describe("WorldQuant role navigation", () => {
  it("adds the active role to a feature route", () => {
    expect(
      worldQuantRoleHref(
        "/worldquant/mission",
        "cpp-data-platform",
      ),
    ).toBe("/worldquant/mission?role=cpp-data-platform");
  });

  it("preserves other query parameters and replaces a stale role", () => {
    expect(
      worldQuantRoleHref(
        "/mock-interview?mode=balanced&role=tick-data-platform#setup",
        "low-latency-cpp",
      ),
    ).toBe(
      "/mock-interview?mode=balanced&role=low-latency-cpp#setup",
    );
  });

  it("rejects external navigation targets", () => {
    expect(() =>
      worldQuantRoleHref(
        "https://example.com/worldquant",
        "tick-data-platform",
      ),
    ).toThrow(/internal routes/);
  });
});
