import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("admin bulk question approval", () => {
  it("uses bounded batches for both canonical questions and translations", async () => {
    const source = await readFile(
      new URL("./admin-dashboard.tsx", import.meta.url),
      "utf8",
    );

    expect(source.match(/submitQuestionApprovalBatches\(\{/g)).toHaveLength(2);
    expect(source).toContain("items: questionReviewQueue");
    expect(source).toContain("items: translationReviews");
  });

  it("keeps progress and failures next to the queue action", async () => {
    const source = await readFile(
      new URL("./admin-dashboard.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("bulkApprovalProgress.approved");
    expect(source).toContain('id="review-queue-notice"');
    expect(source).toContain(
      'role={reviewQueueNotice.tone === "error" ? "alert" : "status"}',
    );
  });
});
