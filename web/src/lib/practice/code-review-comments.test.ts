import { describe, expect, it } from "vitest";

import {
  parseCodeReviewComments,
  renderCodeReviewComments,
} from "./code-review-comments";

describe("code review comments", () => {
  it("stores comments in a readable answer that can be sent to the coach", () => {
    expect(
      renderCodeReviewComments([
        { line: 8, comment: "Có thể dereference con trỏ null ở đây." },
        { line: 3, comment: "Ownership của buffer chưa rõ." },
      ]),
    ).toBe(
      "[Dòng 3]\nOwnership của buffer chưa rõ.\n\n[Dòng 8]\nCó thể dereference con trỏ null ở đây.",
    );
  });

  it("recovers saved comments after a reload and ignores unrelated text", () => {
    expect(
      parseCodeReviewComments(
        "[Dòng 4]\nKiểm tra bounds trước khi đọc.\n\nGhi chú tự do cũ\n\n[Dòng 9]\nSửa ownership bằng RAII.",
      ),
    ).toEqual([
      { line: 4, comment: "Kiểm tra bounds trước khi đọc." },
      { line: 9, comment: "Sửa ownership bằng RAII." },
    ]);
  });
});
