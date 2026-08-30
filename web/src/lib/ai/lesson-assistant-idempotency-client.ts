import type { AiResponseLocale } from "./contracts";
import type { LessonAssistantMessage } from "./lesson-assistant";

export const LESSON_ASSISTANT_PROMPT_VERSION = "lesson-assistant-v1";
export const LESSON_ASSISTANT_MAX_TURNS = 4;

export type LessonAssistantRequestIdentity = {
  lessonId: string;
  contextHash: string;
  messages: LessonAssistantMessage[];
  responseLocale?: AiResponseLocale;
};

export function lessonAssistantCanonicalRequest(
  identity: LessonAssistantRequestIdentity,
) {
  return JSON.stringify({
    promptVersion: LESSON_ASSISTANT_PROMPT_VERSION,
    lessonId: identity.lessonId,
    contextHash: identity.contextHash,
    messages: identity.messages.map((message) => ({
      role: message.role,
      content: message.content.trim(),
    })),
    responseLocale: identity.responseLocale ?? "vi",
  });
}

export async function lessonAssistantIdempotencyKey(
  identity: LessonAssistantRequestIdentity,
) {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(lessonAssistantCanonicalRequest(identity)),
    ),
  );
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
