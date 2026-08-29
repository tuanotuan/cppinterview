import { z } from "zod";

import { categoryForInterviewFormat } from "./interview-formats";

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase kebab-case ID");

export const contentLanguageSchema = z.literal("cpp");
export type ContentLanguage = z.infer<typeof contentLanguageSchema>;

export const practiceDeckSchema = z.literal("cpp-interview");
export type PracticeDeckId = z.infer<typeof practiceDeckSchema>;

export const contentTrackSchema = z.enum([
  "cpp98",
  "cpp11",
  "cpp14",
  "cpp17",
  "cpp20",
]);
export type ContentTrack = z.infer<typeof contentTrackSchema>;

// Compatibility export while the UI still calls a language track "standard".
export const cppStandardSchema = contentTrackSchema;

export const questionSkillSchema = z.enum([
  "recall",
  "code_reasoning",
  "pitfall",
  "scenario",
]);

export const questionDifficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const questionResponseModeSchema = z.enum(["text", "code"]);

export const interviewQuestionCategorySchema = z.enum([
  "language_knowledge",
  "code_reading_ub",
  "coding",
  "code_review_debug",
  "design_performance",
  "communication_ownership",
]);
export type InterviewQuestionCategory = z.infer<
  typeof interviewQuestionCategorySchema
>;

// This stays separate from `type`: the existing four types drive spaced
// repetition, while the interview format describes the concrete interview
// exercise the candidate sees.
export const interviewQuestionFormatSchema = z.enum([
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
]);
export type InterviewQuestionFormat = z.infer<
  typeof interviewQuestionFormatSchema
>;

export const codeTestSuiteMetadataSchema = z.object({
  specRevision: z.number().int().positive(),
  publicTestCount: z.number().int().min(1).max(10),
  hiddenTestCount: z.number().int().min(1).max(30),
});

export const taxonomyTagSchema = z.string().regex(
  /^(?:deck|language|track|standard|topic|skill|difficulty|response|source)::[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Use a controlled namespace::lowercase-kebab-case taxonomy tag",
);

export const questionTaxonomySchema = z
  .object({
    deckId: practiceDeckSchema,
    language: contentLanguageSchema.optional(),
    track: contentTrackSchema.optional(),
    standard: contentTrackSchema,
    topics: z.array(idSchema).min(1),
    skill: questionSkillSchema,
    difficulty: questionDifficultySchema,
    responseMode: questionResponseModeSchema,
    sourceLessonId: idSchema,
    tags: z.array(taxonomyTagSchema).min(6),
    interviewCategory: interviewQuestionCategorySchema.optional(),
    interviewFormat: interviewQuestionFormatSchema.optional(),
    assessmentSkills: z.array(idSchema).min(1).max(6).optional(),
    codeTestSuite: codeTestSuiteMetadataSchema.optional(),
  })
  .superRefine((taxonomy, context) => {
    const expectedLanguage = languageForTrack(
      taxonomy.track ?? taxonomy.standard,
    );
    const deckLanguage = languageForDeck(taxonomy.deckId);
    if (
      expectedLanguage !== deckLanguage ||
      (taxonomy.language !== undefined && taxonomy.language !== deckLanguage)
    ) {
      context.addIssue({
        code: "custom",
        message: `Taxonomy ${taxonomy.deckId} has inconsistent language/track`,
      });
    }
    if (
      taxonomy.interviewFormat &&
      taxonomy.interviewCategory &&
      taxonomy.interviewCategory !==
        categoryForInterviewFormat(taxonomy.interviewFormat)
    ) {
      context.addIssue({
        code: "custom",
        path: ["interviewCategory"],
        message: "Interview format and category must match",
      });
    }
  });

const lessonRegistryEntryBaseSchema = z.object({
  id: idSchema,
  sourcePath: z.string().trim().min(1),
  order: z.number().int().positive(),
  tags: z.array(idSchema).min(1),
  prerequisites: z.array(idSchema).optional().default([]),
});

const normalizedLessonRegistryEntrySchema = lessonRegistryEntryBaseSchema.extend({
  language: contentLanguageSchema,
  track: contentTrackSchema,
  standard: contentTrackSchema,
});

export const lessonRegistryEntrySchema = z
  .union([
    lessonRegistryEntryBaseSchema.extend({
      standard: contentTrackSchema,
      language: contentLanguageSchema.optional(),
      track: contentTrackSchema.optional(),
    }),
    lessonRegistryEntryBaseSchema.extend({
      language: contentLanguageSchema,
      track: contentTrackSchema,
    }),
  ])
  .transform((entry): z.infer<typeof normalizedLessonRegistryEntrySchema> => {
    const track = "track" in entry && entry.track
      ? entry.track
      : "standard" in entry
        ? entry.standard
        : undefined;
    if (!track) throw new Error(`Lesson ${entry.id} is missing a track`);
    const language = entry.language ?? languageForTrack(track);
    if (language !== languageForTrack(track)) {
      throw new Error(`Track ${track} does not belong to ${language}`);
    }
    return normalizedLessonRegistryEntrySchema.parse({
      ...entry,
      language,
      track,
      standard: track,
    });
  });

export const lessonRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  lessons: z.array(lessonRegistryEntrySchema).min(1),
});

export const questionSchema = z.object({
  id: idSchema,
  lessonId: idSchema,
  type: questionSkillSchema,
  responseMode: questionResponseModeSchema.optional(),
  difficulty: questionDifficultySchema,
  interviewCategory: interviewQuestionCategorySchema.optional(),
  interviewFormat: interviewQuestionFormatSchema.optional(),
  assessmentSkills: z.array(idSchema).min(1).max(6).optional(),
  codeTestSuite: codeTestSuiteMetadataSchema.optional(),
  estimatedMinutes: z.number().int().min(1).max(15),
  prompt: z.string().trim().min(10),
  code: z.string().trim().min(1).optional(),
  hint: z.string().trim().min(5),
  answer: z.object({
    short: z.string().trim().min(10),
    detailed: z.string().trim().min(20),
  }),
  rubric: z.object({
    required: z.array(z.string().trim().min(3)).min(1),
    bonus: z.array(z.string().trim().min(3)).optional().default([]),
    misconceptions: z.array(z.string().trim().min(3)).optional().default([]),
  }),
  sources: z
    .array(
      z.object({
        sectionId: idSchema,
      }),
    )
    .min(1),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["draft", "verified", "needs_review", "archived"]),
  version: z.number().int().positive(),
}).superRefine((question, context) => {
  if (
    question.interviewCategory === "coding" &&
    (question.responseMode ?? "text") !== "code"
  ) {
    context.addIssue({
      code: "custom",
      path: ["responseMode"],
      message: "Coding questions must use responseMode: code",
    });
  }
  if (question.codeTestSuite && (question.responseMode ?? "text") !== "code") {
    context.addIssue({
      code: "custom",
      path: ["codeTestSuite"],
      message: "Only code questions can declare a code test suite",
    });
  }
  if (question.interviewFormat === "code_review") {
    if (!question.code) {
      context.addIssue({
        code: "custom",
        path: ["code"],
        message: "Code review questions must include the code being reviewed",
      });
    }
    if ((question.responseMode ?? "text") !== "text") {
      context.addIssue({
        code: "custom",
        path: ["responseMode"],
        message: "Code review questions collect review comments as text",
      });
    }
  }
  if (
    question.interviewFormat &&
    question.interviewCategory &&
    question.interviewCategory !==
      categoryForInterviewFormat(question.interviewFormat)
  ) {
    context.addIssue({
      code: "custom",
      path: ["interviewCategory"],
      message: "Interview format and category must match",
    });
  }
});

export const questionFileSchema = z.object({
  schemaVersion: z.literal(1),
  questions: z.array(questionSchema).min(1),
});

export const lessonSectionSchema = z.object({
  id: idSchema,
  heading: z.string().min(1),
  bodyMarkdown: z.string(),
  bodyText: z.string(),
});

export const generatedLessonSchema = normalizedLessonRegistryEntrySchema.extend({
  title: z.string().min(1),
  knowledgePath: z.string().min(1),
  translationPaths: z.array(z.string().min(1)).min(1).optional(),
  codePath: z.string().min(1).nullable(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  sections: z.array(lessonSectionSchema).min(1),
  checklistItems: z.array(z.string().min(1)),
  code: z.string().nullable(),
});

export const contentManifestSchema = z.object({
  schemaVersion: z.literal(1),
  sourceRevision: z.string().regex(/^[a-f0-9]{64}$/),
  lessons: z.array(generatedLessonSchema),
  questions: z.array(
    questionSchema.extend({
      taxonomy: questionTaxonomySchema,
    }),
  ),
});

export type Question = z.infer<typeof questionSchema>;
export type QuestionTaxonomy = z.infer<typeof questionTaxonomySchema>;
export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;
export type ContentManifest = z.infer<typeof contentManifestSchema>;
export type ContentQuestion = ContentManifest["questions"][number];
export type LessonRegistry = z.infer<typeof lessonRegistrySchema>;
export type LessonRegistryEntry = z.infer<typeof lessonRegistryEntrySchema>;

export function languageForTrack(
  _track: z.infer<typeof contentTrackSchema>,
): z.infer<typeof contentLanguageSchema> {
  void _track;
  return "cpp";
}

function languageForDeck(
  _deck: z.infer<typeof practiceDeckSchema>,
): z.infer<typeof contentLanguageSchema> {
  void _deck;
  return "cpp";
}
