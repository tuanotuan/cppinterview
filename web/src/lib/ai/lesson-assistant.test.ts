import { describe, expect, it } from "vitest";

import {
  lessonAssistantRequestSchema,
  lessonAssistantResponseSchema,
} from "./lesson-assistant";
import {
  lessonAssistantCanonicalRequest,
  lessonAssistantIdempotencyKey,
} from "./lesson-assistant-idempotency-client";

const contextHash = "a".repeat(64);

describe("lesson assistant contracts", () => {
  it("accepts four alternating questions and rejects a fifth turn", () => {
    const messages = [
      { role: "user", content: "Question one" },
      { role: "assistant", content: "Answer one" },
      { role: "user", content: "Question two" },
      { role: "assistant", content: "Answer two" },
      { role: "user", content: "Question three" },
      { role: "assistant", content: "Answer three" },
      { role: "user", content: "Question four" },
    ];

    expect(
      lessonAssistantRequestSchema.safeParse({
        lessonId: "cpp11-toolchain",
        messages,
        responseLocale: "en",
      }).success,
    ).toBe(true);
    expect(
      lessonAssistantRequestSchema.safeParse({
        lessonId: "cpp11-toolchain",
        messages: [
          ...messages,
          { role: "assistant", content: "Answer four" },
          { role: "user", content: "Question five" },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires an alternating conversation ending in a bounded user question", () => {
    expect(
      lessonAssistantRequestSchema.safeParse({
        lessonId: "cpp11-toolchain",
        messages: [{ role: "assistant", content: "Not a user" }],
      }).success,
    ).toBe(false);
    expect(
      lessonAssistantRequestSchema.safeParse({
        lessonId: "cpp11-toolchain",
        messages: [{ role: "user", content: "x".repeat(1_501) }],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate citations and citations on an outside-scope answer", () => {
    expect(
      lessonAssistantResponseSchema.safeParse({
        answer: "Grounded answer",
        sourceSectionIds: ["toolchain", "toolchain"],
        grounding: "lesson",
      }).success,
    ).toBe(false);
    expect(
      lessonAssistantResponseSchema.safeParse({
        answer: "That is outside this lesson.",
        sourceSectionIds: ["toolchain"],
        grounding: "outside_scope",
      }).success,
    ).toBe(false);
  });

  it("binds deterministic UUIDv8 keys to locale, context, and conversation", async () => {
    const identity = {
      lessonId: "cpp11-toolchain",
      contextHash,
      messages: [{ role: "user" as const, content: "What is a toolchain?" }],
      responseLocale: "en" as const,
    };
    const first = await lessonAssistantIdempotencyKey(identity);
    const second = await lessonAssistantIdempotencyKey(identity);

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await expect(
      lessonAssistantIdempotencyKey({ ...identity, responseLocale: "vi" }),
    ).resolves.not.toBe(first);
    await expect(
      lessonAssistantIdempotencyKey({
        ...identity,
        contextHash: "b".repeat(64),
      }),
    ).resolves.not.toBe(first);
    expect(lessonAssistantCanonicalRequest(identity)).toContain(
      "lesson-assistant-v1",
    );
  });
});
