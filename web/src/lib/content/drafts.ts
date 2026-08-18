import { GoogleGenAI } from "@google/genai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  geminiFallbackModel,
  isGeminiFallbackConfigured,
} from "../ai/gemini";
import {
  openAIClient,
  openAIModel,
  safetyIdentifier,
} from "../ai/openai";
import type {
  GeneratedLesson,
  InterviewQuestionCategory,
  InterviewQuestionFormat,
} from "./schema";
import {
  categoryForInterviewFormat,
  draftFormatsForCategories,
  interviewFormatDefinitions,
} from "./interview-formats";

const MAX_PROVIDER_ATTEMPTS = 3;

export const aiQuestionDraftSchema = z.object({
  type: z.enum(["recall", "code_reasoning", "pitfall", "scenario"]),
  responseMode: z.enum(["text", "code"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  interviewCategory: z.enum([
    "language_knowledge",
    "code_reading_ub",
    "coding",
    "code_review_debug",
    "design_performance",
    "communication_ownership",
  ]),
  interviewFormat: z.enum([
    "concept_explanation",
    "bug_hunt",
    "crash_memory_leak",
    "undefined_behavior",
    "api_class_review",
    "implementation_comparison",
    "correctness_preserving_optimization",
    "compiler_diagnostic",
    "ownership_lifetime_design",
    "test_first_debugging",
    "code_review",
    "ownership_communication",
  ]),
  assessmentSkills: z.array(
    z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ).min(1).max(6),
  estimatedMinutes: z.number().int().min(1).max(15),
  prompt: z.string().trim().min(10),
  code: z.string().trim().min(1).nullable(),
  hint: z.string().trim().min(5),
  answer: z.object({
    short: z.string().trim().min(10),
    detailed: z.string().trim().min(20),
  }),
  rubric: z.object({
    required: z.array(z.string().trim().min(3)).min(1),
    bonus: z.array(z.string().trim().min(3)),
    misconceptions: z.array(z.string().trim().min(3)),
  }),
  sources: z.array(z.object({ sectionId: z.string().min(1) })).min(1),
}).superRefine((draft, context) => {
  if (draft.interviewCategory !== categoryForInterviewFormat(draft.interviewFormat)) {
    context.addIssue({
      code: "custom",
      path: ["interviewCategory"],
      message: "Interview category must match the chosen interview format",
    });
  }
  if (draft.interviewFormat === "code_review") {
    if (draft.responseMode !== "text") {
      context.addIssue({
        code: "custom",
        path: ["responseMode"],
        message: "Code review drafts use text review comments",
      });
    }
    if (!draft.code) {
      context.addIssue({
        code: "custom",
        path: ["code"],
        message: "Code review drafts must supply the reviewed code",
      });
    }
  }
});

export const aiDraftResponseSchema = z.object({
  questions: z.array(aiQuestionDraftSchema).min(1).max(5),
});

export type AiQuestionDraft = z.infer<typeof aiQuestionDraftSchema>;
export type GeneratedQuestionDraftBatch = {
  questions: AiQuestionDraft[];
  provider: "openai" | "gemini";
  model: string;
};
export type BeforeQuestionDraftProviderRequest = (
  provider: GeneratedQuestionDraftBatch["provider"],
  model: string,
) => Promise<void>;

export const QUESTION_GENERATOR_PROMPT_VERSION = "multilanguage-interview-bank-v5";

export async function generateQuestionDraftsWithOpenAI({
  lesson,
  count,
  desiredCategories,
  desiredFormats,
}: {
  lesson: GeneratedLesson;
  count: number;
  desiredCategories?: readonly InterviewQuestionCategory[];
  desiredFormats?: readonly InterviewQuestionFormat[];
}): Promise<AiQuestionDraft[]> {
  return (await generateQuestionDraftBatchWithOpenAI({
    lesson,
    count,
    desiredCategories,
    desiredFormats,
  })).questions;
}

export async function generateQuestionDraftBatchWithFallback({
  lesson,
  count,
  desiredCategories,
  desiredFormats,
  beforeProviderRequest,
}: {
  lesson: GeneratedLesson;
  count: number;
  desiredCategories?: readonly InterviewQuestionCategory[];
  desiredFormats?: readonly InterviewQuestionFormat[];
  beforeProviderRequest?: BeforeQuestionDraftProviderRequest;
}): Promise<GeneratedQuestionDraftBatch> {
  try {
    return await generateQuestionDraftBatchWithOpenAI({
      lesson,
      count,
      desiredCategories,
      desiredFormats,
      beforeProviderRequest,
    });
  } catch (error) {
    if (!isProviderRateLimitError(error) || !isGeminiFallbackConfigured()) {
      throw error;
    }
    return generateQuestionDraftBatchWithGemini({
      lesson,
      count,
      desiredCategories,
      desiredFormats,
      beforeProviderRequest,
    });
  }
}

export async function generateQuestionDraftBatchWithOpenAI({
  lesson,
  count,
  desiredCategories,
  desiredFormats,
  beforeProviderRequest,
}: {
  lesson: GeneratedLesson;
  count: number;
  desiredCategories?: readonly InterviewQuestionCategory[];
  desiredFormats?: readonly InterviewQuestionFormat[];
  beforeProviderRequest?: BeforeQuestionDraftProviderRequest;
}): Promise<GeneratedQuestionDraftBatch> {
  if (!Number.isInteger(count) || count < 1 || count > 5) {
    throw new Error("Draft count must be an integer from 1 to 5");
  }

  const client = openAIClient();
  const model = openAIModel("luna");
  const request = {
    model,
    store: false,
    safety_identifier: safetyIdentifier("content-automation"),
    instructions: buildGeneratorSystemInstruction(lesson),
    input: buildDraftPrompt(lesson, count, { desiredCategories, desiredFormats }),
    reasoning: { effort: "low" as const },
    max_output_tokens: 6000,
    text: {
      format: zodTextFormat(aiDraftResponseSchema, "question_drafts"),
      verbosity: "medium" as const,
    },
  };
  const interaction = await retryProviderRateLimit(async () => {
    await beforeProviderRequest?.("openai", model);
    return client.responses.parse(request);
  });

  if (!interaction.output_parsed) {
    throw new Error("OpenAI returned an empty draft response");
  }
  const result = interaction.output_parsed;
  if (result.questions.length !== count) {
    throw new Error(
      `OpenAI returned ${result.questions.length} drafts; expected ${count}`,
    );
  }

  validateDraftSources(lesson, result.questions, "OpenAI");

  return { questions: result.questions, provider: "openai", model };
}

export async function generateQuestionDraftBatchWithGemini({
  lesson,
  count,
  desiredCategories,
  desiredFormats,
  beforeProviderRequest,
}: {
  lesson: GeneratedLesson;
  count: number;
  desiredCategories?: readonly InterviewQuestionCategory[];
  desiredFormats?: readonly InterviewQuestionFormat[];
  beforeProviderRequest?: BeforeQuestionDraftProviderRequest;
}): Promise<GeneratedQuestionDraftBatch> {
  if (!Number.isInteger(count) || count < 1 || count > 5) {
    throw new Error("Draft count must be an integer from 1 to 5");
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  const model = geminiFallbackModel();
  const client = new GoogleGenAI({ apiKey });
  const request = {
    model,
    store: false,
    system_instruction: buildGeneratorSystemInstruction(lesson),
    input: buildDraftPrompt(lesson, count, { desiredCategories, desiredFormats }),
    generation_config: {
      thinking_level: "low" as const,
      temperature: 0.2,
      max_output_tokens: 6000,
    },
    response_format: {
      type: "text" as const,
      mime_type: "application/json",
      schema: z.toJSONSchema(aiDraftResponseSchema),
    },
  };
  await beforeProviderRequest?.("gemini", model);
  const interaction = await client.interactions.create(
    request,
    { timeout: 45_000, maxRetries: 0 },
  );
  if (!interaction.output_text) {
    throw new Error("Gemini returned an empty draft response");
  }
  const result = aiDraftResponseSchema.parse(JSON.parse(interaction.output_text));
  if (result.questions.length !== count) {
    throw new Error(
      `Gemini returned ${result.questions.length} drafts; expected ${count}`,
    );
  }
  validateDraftSources(lesson, result.questions, "Gemini");
  return { questions: result.questions, provider: "gemini", model };
}

export function validateDraftSources(
  lesson: GeneratedLesson,
  questions: AiQuestionDraft[],
  provider: string,
) {
  const sectionIds = new Set(lesson.sections.map((section) => section.id));
  for (const question of questions) {
    for (const source of question.sources) {
      if (!sectionIds.has(source.sectionId)) {
        throw new Error(
          `${provider} cited unknown section ${source.sectionId} in ${lesson.id}`,
        );
      }
    }
  }
}

export async function retryProviderRateLimit<T>(
  operation: () => Promise<T>,
  {
    maxAttempts = MAX_PROVIDER_ATTEMPTS,
    sleep = (milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
  }: {
    maxAttempts?: number;
    sleep?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isProviderRateLimitError(error) || attempt >= maxAttempts) throw error;
      const delayMs = providerRetryDelayMs(error);
      console.warn(
        `OpenAI rate-limited draft generation; retrying attempt ${attempt + 1}/${maxAttempts} in ${Math.ceil(delayMs / 1000)}s.`,
      );
      await sleep(delayMs);
    }
  }
}

export function isProviderRateLimitError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const status =
    "statusCode" in error
      ? error.statusCode
      : "status" in error
        ? error.status
        : undefined;
  return status === 429;
}

function providerRetryDelayMs(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const seconds = Number(/retry in ([\d.]+)s/i.exec(message)?.[1] ?? 60);
  return Math.min(75_000, Math.max(1_000, Math.ceil(seconds * 1000) + 1_000));
}

export function nextQuestionIds(
  lessonId: string,
  existingIds: string[],
  count: number,
) {
  const escaped = lessonId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}-(\\d+)$`);
  const highest = Math.max(
    0,
    ...existingIds.map((id) => Number(pattern.exec(id)?.[1] ?? 0)),
  );

  return Array.from(
    { length: count },
    (_, index) => `${lessonId}-${String(highest + index + 1).padStart(3, "0")}`,
  );
}

export function buildDraftPrompt(
  lesson: GeneratedLesson,
  count: number,
  {
    desiredCategories = [],
    desiredFormats = [],
  }: {
    desiredCategories?: readonly InterviewQuestionCategory[];
    desiredFormats?: readonly InterviewQuestionFormat[];
  } = {},
) {
  const language = languageDisplayName(lesson);
  const scenarioScope = "a production C++ trading system";
  const sections = lesson.sections.map((section) => ({
    sectionId: section.id,
    heading: section.heading,
    content: section.bodyMarkdown.slice(0, 3000),
  }));
  const formats = desiredFormats.length
    ? desiredFormats
    : draftFormatsForCategories(desiredCategories, count);

  return JSON.stringify(
    {
      task: `Create exactly ${count} distinct interview-question drafts. Cite only sectionId values supplied below.`,
      rules: [
        "Use Vietnamese for prompt, hint, answers, and rubric.",
        "Test understanding and reasoning, not trivia.",
        `Target ${language} software-engineering interviews at trading and quantitative-finance companies.`,
        count >= 2
          ? `Include at least one question whose type is scenario and whose situation is realistic for ${scenarioScope}.`
          : `Prefer type scenario when the lesson can support a realistic situation in ${scenarioScope} without forcing the context.`,
        "A C++ trading scenario must involve a concrete engineering constraint or failure mode, such as market-data throughput, order-book updates, order routing, pre-trade risk checks, position state, exchange connectivity, latency, allocation, cache locality, concurrency, contention, backpressure, deterministic behavior, ownership, or recovery.",
        "Do not merely rename a toy variable to Order or Price. The trading context must materially affect the design choice, correctness argument, performance trade-off, or failure analysis being tested.",
        "Keep scenarios plausible and answerable in an interview. State enough context and constraints for the candidate; do not assume undocumented infrastructure.",
        `Do not require finance-domain knowledge that is absent from the lesson. Never invent exchange rules, latency numbers, market behavior, or risk formulas; the assessed ${language} facts must remain grounded in the supplied sections.`,
        "Keep the canonical short answer concise and make the detailed answer interview-ready.",
        "Use code only when it materially improves the question; otherwise return null.",
        "Never put fenced code or a code snippet inside prompt. When a snippet is needed, store it only in the separate code field and let prompt refer to it as the code below.",
        `Set responseMode to code only when the candidate is explicitly required to write or modify ${language} code. Explanatory, analytical, and scenario questions must use text.`,
        "When responseMode is code, make the prompt explicitly ask the candidate to write or modify code.",
        "Set interviewCategory to exactly one of language_knowledge, code_reading_ub, coding, code_review_debug, design_performance, or communication_ownership.",
        `Set interviewFormat to one of: ${formats.join(", ")}. Its interviewCategory must match the format's required category below.`,
        "For code_review, return a non-empty separate code field and responseMode text. The candidate will leave line-level comments; do not put review hints in the prompt.",
        "Set assessmentSkills to one to six concrete lowercase kebab-case skills being measured, grounded in the supplied lesson.",
        "Use interviewCategory coding only with responseMode code. Do not claim that a generated draft has executable tests; test suites are added and reviewed separately by a maintainer.",
        desiredCategories.length
          ? `Prioritize these currently under-covered categories when the supplied lesson can genuinely support them: ${desiredCategories.join(", ")}. If a requested category is not grounded by the lesson, choose the closest supported category instead of inventing content.`
          : "Choose the category that most accurately describes the skill being measured.",
      ],
      lesson: {
        id: lesson.id,
        title: lesson.title,
        language: lesson.language,
        track: lesson.track,
        standard: lesson.standard,
        sections,
        code: lesson.code?.slice(0, 6000) ?? null,
      },
      requestedInterviewFormats: formats.map((format) => ({
        format,
        category: categoryForInterviewFormat(format),
        instruction: interviewFormatDefinitions[format].generatorInstruction,
      })),
    },
    null,
    2,
  );
}

export function buildGeneratorSystemInstruction(lesson: GeneratedLesson) {
  const language = languageDisplayName(lesson);
  return `You create grounded ${language} interview questions for software-engineering interviews at trading and quantitative-finance companies. Return Vietnamese questions and answers. Never introduce facts not supported by the supplied private study note.`;
}

function languageDisplayName(_lesson: GeneratedLesson) {
  void _lesson;
  return "C++";
}
