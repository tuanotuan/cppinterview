import { z } from "zod";

import { questionApprovalBatchSize } from "./question-approval-batches";

export const questionTranslationApprovalSchema = z.object({
  questionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  questionVersion: z.number().int().positive(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  locale: z.literal("en"),
});

export const approveQuestionTranslationsSchema = z.object({
  translations: z
    .array(questionTranslationApprovalSchema)
    .min(1)
    .max(questionApprovalBatchSize)
    .superRefine((translations, context) => {
      const seen = new Set<string>();
      translations.forEach((translation, index) => {
        const key = [
          translation.questionId,
          translation.questionVersion,
          translation.locale,
        ].join(":");
        if (seen.has(key)) {
          context.addIssue({
            code: "custom",
            message: "Duplicate question translation approval",
            path: [index],
          });
        }
        seen.add(key);
      });
    }),
});

export type QuestionTranslationApproval = z.infer<
  typeof questionTranslationApprovalSchema
>;
