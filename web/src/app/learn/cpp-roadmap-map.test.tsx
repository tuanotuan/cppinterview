import { readFileSync } from "node:fs";
import path from "node:path";

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

  it.each([
    ["learning", "#dad1fd", "#cec2fa"],
    ["done", "#8bd7af", "#76c99f"],
    ["skipped", "#496b69", "#3c5a58"],
  ])(
    "fills the whole lesson node for the %s state",
    (status, expectedSurface, expectedHoverSurface) => {
      expect(globalStyles).toContain(
        `--roadmap-${status}-surface: ${expectedSurface};`,
      );
      expect(globalStyles).toContain(
        `--roadmap-${status}-surface-hover: ${expectedHoverSurface};`,
      );

      const selector = `.cpp-roadmap-node-shell > a[data-progress="${status}"]`;
      const baseRule = cssRuleBody(selector);
      const hoverRule = cssRuleBody(`${selector}:hover`);

      expect(baseRule).toContain(
        `background: var(--roadmap-${status}-surface);`,
      );
      expect(baseRule).toContain(
        `border-color: var(--roadmap-${status}-border);`,
      );
      expect(hoverRule).toContain(
        `background: var(--roadmap-${status}-surface-hover);`,
      );
    },
  );

  it("keeps skipped lesson text readable on the dark full-node surface", () => {
    expect(
      cssRuleBody(
        '.cpp-roadmap-node-shell > a[data-progress="skipped"]',
      ),
    ).toContain("color: var(--roadmap-skipped-ink);");
  });
});

const globalStyles = readFileSync(
  path.resolve(import.meta.dirname, "../globals.css"),
  "utf8",
).replaceAll("\r\n", "\n");

function cssRuleBody(selector: string): string {
  const start = globalStyles.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing CSS rule: ${selector}`);

  const bodyStart = globalStyles.indexOf("{", start) + 1;
  const end = globalStyles.indexOf("}", bodyStart);
  if (end < 0) throw new Error(`Unclosed CSS rule: ${selector}`);
  return globalStyles.slice(bodyStart, end);
}

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
