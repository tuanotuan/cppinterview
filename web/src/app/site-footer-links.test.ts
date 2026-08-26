import { describe, expect, it } from "vitest";

import {
  footerAccountLinks,
  footerExternalLinks,
  footerPrimaryLinks,
} from "./site-footer-links";

describe("site footer links", () => {
  it("keeps the learner destinations in a stable quick-navigation order", () => {
    expect(footerPrimaryLinks.map(({ href }) => href)).toEqual([
      "/practice?guest=1",
      "/learn",
      "/mock-interview",
      "/stats",
      "/profile",
    ]);
  });

  it("uses internal paths for account actions and secure URLs externally", () => {
    expect(footerAccountLinks.every(({ href }) => href.startsWith("/"))).toBe(
      true,
    );
    expect(
      footerExternalLinks.every(({ href }) => href.startsWith("https://")),
    ).toBe(true);
  });

  it("does not repeat a destination within the same footer group", () => {
    for (const links of [
      footerPrimaryLinks,
      footerAccountLinks,
      footerExternalLinks,
    ]) {
      const hrefs = links.map(({ href }) => href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });
});
