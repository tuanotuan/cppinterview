import { describe, expect, it } from "vitest";

import {
  buildStandaloneManualQuestion,
  standaloneManualQuestionLessonId,
  standaloneManualQuestionSectionId,
} from "./standalone-manual-question";

describe("standalone manual questions", () => {
  it("derives the internal review document from only a prompt and reference answer", () => {
    const result = buildStandaloneManualQuestion({
      prompt: "Khi nào bạn chọn std::unique_ptr thay vì std::shared_ptr?",
      referenceAnswer:
        "Ưu tiên unique_ptr khi ownership là duy nhất. Chỉ dùng shared_ptr khi nhiều owner thật sự cần cùng quản lý vòng đời đối tượng.",
    });

    expect(result.sources).toEqual([{ sectionId: standaloneManualQuestionSectionId }]);
    expect(result.taxonomy.sourceLessonId).toBe(standaloneManualQuestionLessonId);
    expect(result.code).toBeNull();
    expect(result.contentChecksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
