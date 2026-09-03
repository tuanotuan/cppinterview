import type { AnchorHTMLAttributes, ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

type MockLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  children: ReactNode;
  href: string;
};

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: MockLinkProps) =>
    createElement("a", { ...props, href }, children),
}));

import {
  CppRoadmapMap,
  type CppRoadmapMapCopy,
  type CppRoadmapProgressCopy,
} from "./cpp-roadmap-map";

describe("CppRoadmapMap", () => {
  it("keeps lesson navigation separate from the three progress actions", () => {
    const html = renderToStaticMarkup(
      <CppRoadmapMap
        roadmap={roadmap}
        copy={mapCopy}
        progressCopy={progressCopy}
      />,
    );

    const lessonLink = html.match(/<a[^>]+href="\/learn\/cpp11-toolchain"[\s\S]*?<\/a>/)?.[0];
    expect(lessonLink).toBeDefined();
    expect(lessonLink).toContain('target="_blank"');
    expect(lessonLink).not.toContain("<button");
    expect(html).toContain('role="group"');
    expect(html).toContain("Learning");
    expect(html).toContain("Done");
    expect(html).toContain("Skip");
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(3);
    expect(html).toContain('aria-expanded="false"');
  });
});

const day = {
  day: 1,
  phaseId: "foundations",
  title: "Toolchain",
  objective: "Build a program",
  dependsOn: [],
  lessons: [{ id: "cpp11-toolchain", title: "Toolchain" }],
  coverage: "ready" as const,
};

const roadmap = {
  track: "cpp11" as const,
  phases: [
    {
      id: "foundations",
      order: 1,
      title: "Foundations",
      summary: "Start here",
      days: [day],
    },
  ],
};

const mapCopy: CppRoadmapMapCopy = {
  mapAria: "C++11 map",
  start: "Start",
  finish: "Finish",
  phaseLabels: { foundations: "Phase 1" },
  days: {
    1: {
      dayLabel: "Day 1",
      openAria: "Open Toolchain",
      unavailableAria: "Unavailable",
    },
  },
};

const progressCopy: CppRoadmapProgressCopy = {
  personalProgress: "Your progress",
  completed: "covered",
  learning: "Learning",
  done: "Done",
  skipped: "Skip",
  actionsAria: "Update lesson status",
  toggleAria: "Open lesson status choices",
  resetHint: "Select again to clear",
  loading: "Loading",
  loadError: "Could not load",
  saveError: "Could not save",
  saved: "Saved",
  loginTitle: "Log in or sign up",
  loginDescription: "Log in to save progress",
  closeDialog: "Close",
  useEmail: "Use email",
  or: "or",
  github: "Continue with GitHub",
  google: "Continue with Google",
};
