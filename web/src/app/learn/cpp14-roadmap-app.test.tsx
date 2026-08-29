import type { AnchorHTMLAttributes, ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Cpp14Roadmap, RoadmapCoverage } from "@/lib/learn/cpp14-roadmap";

type MockLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  children: ReactNode;
  href: string;
};

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    (key: string, values?: Record<string, number | string>) => {
      const messages: Record<string, string> = {
        "Cpp14Roadmap.coverage.ready": "Lesson ready",
        "Cpp14Roadmap.coverage.partial": "Partially covered",
        "Cpp14Roadmap.coverage.planned": "Coming soon",
      };

      if (namespace === "Cpp14Roadmap" && key === "dayLabel") {
        return `Day ${values?.day}`;
      }
      if (namespace === "Cpp14Roadmap" && key === "phaseLabel") {
        return `Phase ${values?.number}`;
      }
      return messages[`${namespace}.${key}`] ?? `${namespace}.${key}`;
    },
}));

vi.mock("@/app/brand-mark", () => ({
  BrandMark: () => createElement("span", null, "Brand"),
}));

vi.mock("@/app/language-switcher", () => ({
  LanguageSwitcher: () => createElement("span", null, "Language"),
}));

vi.mock("@/app/learn/learn-view-nav", () => ({
  LearnViewNav: () => createElement("span", null, "Views"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: MockLinkProps) =>
    createElement("a", { ...props, href }, children),
}));

import { Cpp14RoadmapApp } from "./cpp14-roadmap-app";

describe("Cpp14RoadmapApp", () => {
  it("does not repeat the ready status on lesson nodes or in the legend", async () => {
    const html = renderToStaticMarkup(
      await Cpp14RoadmapApp({ roadmap: makeRoadmap("ready") }),
    );

    expect(html).toContain("Day 1");
    expect(html).toContain("Toolchain");
    expect(html).not.toContain("Lesson ready");
  });

  it("keeps exceptional coverage visible in the legend", async () => {
    const html = renderToStaticMarkup(
      await Cpp14RoadmapApp({ roadmap: makeRoadmap("partial") }),
    );

    expect(html).toContain("Partially covered");
  });
});

function makeRoadmap(coverage: RoadmapCoverage): Cpp14Roadmap {
  const day = {
    day: 1,
    phaseId: "foundations",
    title: "Toolchain",
    objective: "Understand the build pipeline",
    dependsOn: [],
    lessons: [{ id: "cpp14-toolchain-compiler-flags-cpp14", title: "Toolchain" }],
    coverage,
  };

  return {
    track: "cpp14",
    days: [day],
    phases: [
      {
        id: "foundations",
        order: 1,
        title: "Foundations",
        summary: "Core language foundations",
        days: [day],
      },
    ],
    coverageCounts: {
      ready: coverage === "ready" ? 1 : 0,
      partial: coverage === "partial" ? 1 : 0,
      planned: coverage === "planned" ? 1 : 0,
    },
  };
}
