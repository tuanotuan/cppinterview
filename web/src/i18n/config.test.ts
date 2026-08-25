import { describe, expect, it } from "vitest";

import {
  localeFromPathname,
  localizeHref,
  stripLocalePrefix,
} from "./routing";
import { localizedAlternates } from "./metadata";

describe("locale routing helpers", () => {
  it("detects and strips supported locale prefixes", () => {
    expect(localeFromPathname("/vi/practice")).toBe("vi");
    expect(localeFromPathname("/en/learn/foo")).toBe("en");
    expect(localeFromPathname("/fr/practice")).toBeNull();
    expect(stripLocalePrefix("/en/practice")).toBe("/practice");
    expect(stripLocalePrefix("/vi")).toBe("/");
  });

  it("localizes internal hrefs while preserving query and hash", () => {
    expect(localizeHref("/practice?guest=1#answer", "en")).toBe(
      "/en/practice?guest=1#answer",
    );
    expect(localizeHref("/vi/learn/foo", "en")).toBe("/en/learn/foo");
    expect(localizeHref("https://example.com", "en")).toBe(
      "https://example.com",
    );
  });

  it("emits distinct canonical and hreflang paths", () => {
    expect(localizedAlternates("/learn", "en")).toEqual({
      canonical: "/en/learn",
      languages: {
        vi: "/vi/learn",
        en: "/en/learn",
        "x-default": "/vi/learn",
      },
    });
  });
});
