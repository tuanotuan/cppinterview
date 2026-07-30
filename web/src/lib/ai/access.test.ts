import { describe, expect, it } from "vitest";

import { isUnmeteredLocalAiEnabled } from "./access";

describe("isUnmeteredLocalAiEnabled", () => {
  it("requires an explicit opt-in in local development", () => {
    expect(
      isUnmeteredLocalAiEnabled({
        NODE_ENV: "development",
        ALLOW_UNMETERED_LOCAL_AI: "true",
      }),
    ).toBe(true);
    expect(isUnmeteredLocalAiEnabled({ NODE_ENV: "development" })).toBe(false);
  });

  it("never enables unmetered AI in a production or test process", () => {
    expect(
      isUnmeteredLocalAiEnabled({
        NODE_ENV: "production",
        ALLOW_UNMETERED_LOCAL_AI: "true",
      }),
    ).toBe(false);
    expect(
      isUnmeteredLocalAiEnabled({
        NODE_ENV: "test",
        ALLOW_UNMETERED_LOCAL_AI: "true",
      }),
    ).toBe(false);
  });
});
