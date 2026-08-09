import { describe, expect, it } from "vitest";

import { publicAiQuotaPresentation } from "./public-ai-quota-display";

describe("public AI quota presentation", () => {
  it("never presents an unknown server snapshot as three fresh turns", () => {
    expect(publicAiQuotaPresentation(null)).toMatchObject({
      label: "Đang kiểm tra",
      progressPercent: 0,
      remaining: null,
    });
  });

  it("renders the effective remaining count returned by the server", () => {
    const presentation = publicAiQuotaPresentation({
      limit: 3,
      remaining: 1,
      resetsAt: "2026-08-10T12:00:00.000Z",
    });

    expect(presentation).toMatchObject({
      label: "1/3 lượt còn",
      exhausted: false,
    });
    expect(presentation.progressPercent).toBeCloseTo(100 / 3);
  });
});
