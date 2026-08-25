import { describe, expect, it } from "vitest";

import { shouldBypassI18n } from "./i18n/proxy-routing";

describe("locale proxy exclusions", () => {
  it.each([
    "/api/coach/evaluate",
    "/admin",
    "/admin/coverage",
    "/worldquant/full-round",
    "/auth/callback",
    "/auth/confirm",
    "/auth/login",
    "/auth/logout",
  ])("keeps technical or private route %s unprefixed", (pathname) => {
    expect(shouldBypassI18n(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/vi/practice",
    "/en/learn",
    "/auth",
    "/auth/reset-password",
  ])("localizes learner route %s", (pathname) => {
    expect(shouldBypassI18n(pathname)).toBe(false);
  });
});
