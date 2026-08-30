import { describe, expect, it, vi } from "vitest";

import { approveQuestionsSchema } from "@/lib/practice/approvals";

import {
  questionApprovalBatchSize,
  submitQuestionApprovalBatches,
} from "./question-approval-batches";
import { approveQuestionTranslationsSchema } from "./question-translation-approval";

describe("question approval batches", () => {
  it("keeps client batches aligned with both API validation limits", () => {
    const approvals = Array.from(
      { length: questionApprovalBatchSize + 1 },
      (_, index) => ({
        questionId: `question-${index}`,
        questionVersion: 1,
        sourceHash: "a".repeat(64),
      }),
    );

    expect(
      approveQuestionsSchema.safeParse({
        questions: approvals.slice(0, questionApprovalBatchSize),
      }).success,
    ).toBe(true);
    expect(
      approveQuestionsSchema.safeParse({ questions: approvals }).success,
    ).toBe(false);
    expect(
      approveQuestionTranslationsSchema.safeParse({
        translations: approvals
          .slice(0, questionApprovalBatchSize)
          .map((approval) => ({ ...approval, locale: "en" })),
      }).success,
    ).toBe(true);
    expect(
      approveQuestionTranslationsSchema.safeParse({
        translations: approvals.map((approval) => ({
          ...approval,
          locale: "en",
        })),
      }).success,
    ).toBe(false);
  });

  it("submits a large queue sequentially in API-sized batches", async () => {
    const items = Array.from({ length: 600 }, (_, index) => index);
    const approvedBatchSizes: number[] = [];
    const submit = vi.fn(async (batch: readonly number[]) => {
      expect(batch.length).toBeLessThanOrEqual(questionApprovalBatchSize);
      return Response.json({ approved: true });
    });

    const result = await submitQuestionApprovalBatches({
      items,
      submit,
      failureMessage: "Approval failed.",
      onBatchApproved: (batch) => approvedBatchSizes.push(batch.length),
    });

    expect(submit).toHaveBeenCalledTimes(3);
    expect(submit.mock.calls.map(([batch]) => batch.length)).toEqual([
      questionApprovalBatchSize,
      questionApprovalBatchSize,
      questionApprovalBatchSize,
    ]);
    expect(approvedBatchSizes).toEqual([200, 200, 200]);
    expect(result).toEqual({ approved: items, error: null });
  });

  it("keeps confirmed batches and stops after the first rejected batch", async () => {
    const items = Array.from({ length: 450 }, (_, index) => index);
    const submit = vi
      .fn<(batch: readonly number[]) => Promise<Response>>()
      .mockResolvedValueOnce(Response.json({ approved: true }))
      .mockResolvedValueOnce(
        Response.json(
          { error: "Phiên bản câu hỏi đã thay đổi." },
          { status: 409 },
        ),
      );

    const result = await submitQuestionApprovalBatches({
      items,
      submit,
      failureMessage: "Approval failed.",
    });

    expect(submit).toHaveBeenCalledTimes(2);
    expect(result.approved).toEqual(items.slice(0, questionApprovalBatchSize));
    expect(result.error).toBe("Phiên bản câu hỏi đã thay đổi.");
  });

  it("returns a recoverable error when the network request fails", async () => {
    const submit = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      submitQuestionApprovalBatches({
        items: [1, 2, 3],
        submit,
        failureMessage: "Không kết nối được máy chủ.",
      }),
    ).resolves.toEqual({
      approved: [],
      error: "Không kết nối được máy chủ.",
    });
  });
});
