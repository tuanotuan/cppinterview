import { describe, expect, it } from "vitest";

import englishMessages from "@/messages/en.json";
import vietnameseMessages from "@/messages/vi.json";

import { footerContactLinks, footerCreatorHandle } from "./site-footer-links";

describe("site footer identity and contact links", () => {
  it("shows the creator handle as non-linked identity data", () => {
    expect(footerCreatorHandle).toBe("tuanotuan");
    expect(footerCreatorHandle).not.toMatch(/^https?:/);
  });

  it("contains only the three contact destinations supplied by the creator", () => {
    expect(footerContactLinks).toEqual([
      expect.objectContaining({
        kind: "github",
        href: "https://github.com/tuanotuan/",
        external: true,
      }),
      expect.objectContaining({
        kind: "facebook",
        href: "https://www.facebook.com/CNTT.HCMUS.K23",
        external: true,
      }),
      expect.objectContaining({
        kind: "email",
        href: "mailto:tuan.hcmus77@gmail.com",
        external: false,
      }),
    ]);
  });

  it("provides localized accessible labels for every contact icon", () => {
    for (const { labelKey } of footerContactLinks) {
      const key = labelKey.replace("footer.", "") as
        | "github"
        | "facebook"
        | "email";

      expect(vietnameseMessages.Common.footer[key]).toBeTruthy();
      expect(englishMessages.Common.footer[key]).toBeTruthy();
    }
  });

  it("does not advertise unavailable policy or social destinations", () => {
    const hrefs = footerContactLinks.map(({ href }) => href);

    expect(hrefs).toHaveLength(3);
    expect(
      hrefs.some((href) => /linkedin|youtube|twitter|x\.com|bsky/i.test(href)),
    ).toBe(false);
    expect(vietnameseMessages.Common.footer).not.toHaveProperty("terms");
    expect(vietnameseMessages.Common.footer).not.toHaveProperty("privacy");
    expect(englishMessages.Common.footer).not.toHaveProperty("terms");
    expect(englishMessages.Common.footer).not.toHaveProperty("privacy");
  });
});
