import { describe, expect, it } from "vitest";

import { questionBankCodeTestSpecForQuestion } from "./question-bank-execution-specs";

describe("question-bank code test registry", () => {
  it("fails closed until a server-owned suite is registered", () => {
    expect(
      questionBankCodeTestSpecForQuestion({
        id: "cpp20-example-coding",
        version: 1,
        sourceHash: "a".repeat(64),
        responseMode: "code",
        codeTestSuite: {
          specRevision: 1,
          publicTestCount: 1,
          hiddenTestCount: 1,
        },
      }),
    ).toBeNull();
  });
});
