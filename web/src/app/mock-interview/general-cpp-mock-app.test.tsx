import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { GeneralCppHistoryDetail } from "@/lib/mock-interview/contracts-v5";

vi.mock("@/app/brand-mark", () => ({ BrandMark: () => null }));
vi.mock("@/app/language-switcher", () => ({
  LanguageSwitcher: () => null,
}));
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

import { HistoryPanel, SubmittedAnswer } from "./general-cpp-mock-app";

describe("general C++ mock history", () => {
  it("renders each saved report as a keyboard-operable button", () => {
    const onOpen = vi.fn();
    const detail = {} as GeneralCppHistoryDetail;
    const html = renderToStaticMarkup(
      <HistoryPanel
        history={[
          {
            attemptId: "4a72364d-7209-4fa4-802b-d99cf5224f8c",
            sessionId: "866c9819-b77f-43ef-aa04-fbddeca40012",
            completedAt: "2026-09-01T08:32:00.000Z",
            durationMinutes: 30,
            overallScore: 72,
            readiness: "developing",
            standardScores: [],
            detail,
          },
        ]}
        locale="en"
        title="Recent history"
        empty="No completed sessions yet."
        cloud="Saved privately to cloud"
        onOpen={onOpen}
      />,
    );

    expect(html).toContain("<button");
    expect(html).toContain('aria-label="View report: 72/100');
    expect(html).toContain("View report");
    expect(html).toContain("Saved privately to cloud");
  });

  it("renders a submitted answer as escaped text", () => {
    const html = renderToStaticMarkup(
      <SubmittedAnswer
        label="Submitted answer"
        response={'<img src=x onerror="alert(1)">'}
        empty="No answer was submitted."
      />,
    );

    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain("<img");
  });
});
