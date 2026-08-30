import { z } from "zod";

import {
  aiResponseLocaleSchema,
} from "./contracts";

export const LESSON_ASSISTANT_MAX_MESSAGES = 7;
export const LESSON_ASSISTANT_MAX_CONTEXT_CHARACTERS = 20_000;

const lessonIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

export const lessonAssistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(3_000),
});

export const lessonAssistantRequestSchema = z
  .object({
    lessonId: lessonIdSchema,
    messages: z
      .array(lessonAssistantMessageSchema)
      .min(1)
      .max(LESSON_ASSISTANT_MAX_MESSAGES),
    responseLocale: aiResponseLocaleSchema.default("vi"),
    idempotencyKey: z.string().uuid().optional(),
  })
  .superRefine(({ messages }, context) => {
    if (messages.at(-1)?.role !== "user") {
      context.addIssue({
        code: "custom",
        path: ["messages"],
        message: "The final lesson assistant message must come from the user.",
      });
    }

    let totalCharacters = 0;
    messages.forEach((message, index) => {
      totalCharacters += message.content.length;
      const expectedRole = index % 2 === 0 ? "user" : "assistant";
      if (message.role !== expectedRole) {
        context.addIssue({
          code: "custom",
          path: ["messages", index, "role"],
          message: `Message ${index} must have role ${expectedRole}.`,
        });
      }
      if (message.role === "user" && message.content.length > 1_500) {
        context.addIssue({
          code: "too_big",
          origin: "string",
          maximum: 1_500,
          inclusive: true,
          path: ["messages", index, "content"],
          message: "A lesson assistant question cannot exceed 1500 characters.",
        });
      }
    });

    if (totalCharacters > 9_000) {
      context.addIssue({
        code: "too_big",
        origin: "array",
        maximum: 9_000,
        inclusive: true,
        path: ["messages"],
        message: "The lesson assistant conversation is too large.",
      });
    }
  });

export const lessonAssistantResponseSchema = z
  .object({
    answer: z.string().trim().min(1).max(3_000),
    sourceSectionIds: z
      .array(z.string().trim().min(1).max(120))
      .max(4),
    grounding: z.enum([
      "lesson",
      "lesson_plus_general",
      "outside_scope",
    ]),
  })
  .superRefine(({ grounding, sourceSectionIds }, context) => {
    if (new Set(sourceSectionIds).size !== sourceSectionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["sourceSectionIds"],
        message: "Lesson assistant source section IDs must be unique.",
      });
    }
    if (grounding === "outside_scope" && sourceSectionIds.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["sourceSectionIds"],
        message: "An outside-scope answer cannot cite lesson sections.",
      });
    }
  });

export type LessonAssistantMessage = z.infer<
  typeof lessonAssistantMessageSchema
>;
export type LessonAssistantRequest = z.infer<
  typeof lessonAssistantRequestSchema
>;
export type LessonAssistantResponse = z.infer<
  typeof lessonAssistantResponseSchema
>;
