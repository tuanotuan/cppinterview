import type { AnchorHTMLAttributes, ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import englishMessages from "@/messages/en.json";
import vietnameseMessages from "@/messages/vi.json";

type MockLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  children: ReactNode;
  href: string;
};

vi.mock("next-intl", () => ({
  useTranslations: () =>
    (key: string, values?: Record<string, string>) => {
      const messages: Record<string, string> = {
        navAria: "Chọn cách xem thư viện",
        list: "Danh sách bài học",
        roadmap: "Roadmap",
        chooseRoadmap: "Chọn phiên bản roadmap",
        openRoadmap: "Mở roadmap",
        roadmapComingSoon: "Sắp có",
      };
      if (key === "roadmapFor") {
        return `Roadmap ${values?.standard ?? ""}`.trim();
      }
      return messages[key] ?? key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: MockLinkProps) =>
    createElement("a", { ...props, href }, children),
}));

import { LearnViewNav } from "./learn-view-nav";

describe("LearnViewNav", () => {
  it.each([
    ["all", "Roadmap"],
    ["cpp98", "Roadmap C++98"],
    ["cpp11", "Roadmap C++11"],
    ["cpp14", "Roadmap C++14"],
    ["cpp17", "Roadmap C++17"],
    ["cpp20", "Roadmap C++20"],
    ["cpp23", "Roadmap C++23"],
  ] as const)("labels the %s roadmap from the active filter", (filter, label) => {
    const html = renderToStaticMarkup(
      <LearnViewNav current="list" selectedStandard={filter} />,
    );

    expect(html).toContain(`>${label}<`);
  });

  it("uses a generic roadmap label and offers every version for All", () => {
    const html = renderToStaticMarkup(
      <LearnViewNav current="list" selectedStandard="all" />,
    );

    expect(html).toContain(">Roadmap<svg");
    expect(html).toContain("Chọn phiên bản roadmap");
    expect(roadmapLinkCount(html)).toBe(2);
    expect(html).toContain("C++98");
    expect(html).toContain("C++23");
    expect(html).toContain('aria-disabled="true"');
  });

  it("names an unavailable roadmap after the selected standard", () => {
    const html = renderToStaticMarkup(
      <LearnViewNav current="list" selectedStandard="cpp20" />,
    );

    expect(html).toContain(">Roadmap C++20<svg");
    expect(html).toContain("Sắp có");
    expect(roadmapLinkCount(html)).toBe(2);
  });

  it.each([
    ["cpp11", "/learn/roadmap/cpp11", "Roadmap C++11"],
    ["cpp14", "/learn/roadmap/cpp14", "Roadmap C++14"],
  ] as const)(
    "links directly to the roadmap for the selected supported standard %s",
    (standard, href, label) => {
    const html = renderToStaticMarkup(
      <LearnViewNav current="list" selectedStandard={standard} />,
    );

    expect(html).toContain(`>${label}</a>`);
    expect(html).toContain(`href="${href}"`);
    expect(html).not.toContain("<details");
    },
  );

  it("marks the roadmap view as the current page", () => {
    const html = renderToStaticMarkup(
      <LearnViewNav current="roadmap" selectedStandard="cpp11" />,
    );

    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(">Roadmap C++11</a>");
  });

  it("keeps the English and Vietnamese roadmap message contracts aligned", () => {
    expect(Object.keys(englishMessages.Learn.views).sort()).toEqual(
      Object.keys(vietnameseMessages.Learn.views).sort(),
    );
    expect(englishMessages.Learn.views.roadmapFor).toBe("{standard} roadmap");
    expect(vietnameseMessages.Learn.views.roadmapFor).toBe(
      "Roadmap {standard}",
    );
    expect(Object.keys(englishMessages.Cpp14Roadmap).sort()).toEqual(
      Object.keys(vietnameseMessages.Cpp14Roadmap).sort(),
    );
  });
});

function roadmapLinkCount(html: string) {
  return html.match(/href="\/learn\/roadmap\/(?:cpp11|cpp14)"/g)?.length ?? 0;
}
