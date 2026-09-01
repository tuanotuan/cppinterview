import { describe, expect, it } from "vitest";

import englishMessages from "@/messages/en.json";
import vietnameseMessages from "@/messages/vi.json";

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

  it("presents the repository link as a source contribution action in Vietnamese", () => {
    expect(vietnameseMessages.Common.footer.github).toBe(
      "Đóng góp mã nguồn",
    );
    expect(
      footerExternalLinks.find(({ labelKey }) => labelKey === "footer.github")
        ?.href,
    ).toBe("https://github.com/tuanotuan/cppinterview");
  });

  it("links the bilingual Vibe Coding community label to the Facebook group", () => {
    expect(vietnameseMessages.Common.footer.vibeCodingCommunity).toBe(
      "Cộng đồng Vibe Coding",
    );
    expect(englishMessages.Common.footer.vibeCodingCommunity).toBe(
      "Vibe Coding community",
    );
    expect(
      footerExternalLinks.find(
        ({ labelKey }) => labelKey === "footer.vibeCodingCommunity",
      )?.href,
    ).toBe("https://www.facebook.com/groups/1318098620529328");
    expect(vietnameseMessages.Common.footer).not.toHaveProperty("facebook");
    expect(englishMessages.Common.footer).not.toHaveProperty("facebook");
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
