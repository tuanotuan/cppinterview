import { z } from "zod";

const selectionSchema = z.record(
  z.string().min(1).max(120),
  z.string().max(240),
);

const attemptSchema = z.object({
  activityId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(120),
  activityVersion: z.number().int().positive(),
  selections: selectionSchema,
  passedCheckIds: z.array(z.string().min(1).max(120)).max(40),
  completedAt: z.string().datetime().nullable(),
});

const progressSchema = z.object({
  version: z.literal(1),
  attempts: z.record(z.string(), attemptSchema),
});

export type AppliedActivityAttempt = z.infer<typeof attemptSchema>;
export type AppliedActivityProgress = z.infer<typeof progressSchema>;

export const EMPTY_APPLIED_ACTIVITY_PROGRESS: AppliedActivityProgress = {
  version: 1,
  attempts: {},
};

export function appliedActivityProgressStorageKey(accountId: string | null) {
  return `recall:worldquant-applied-activities:${accountId ?? "local"}:v1`;
}

export function parseAppliedActivityProgress(
  raw: string | null,
): AppliedActivityProgress {
  if (!raw) return EMPTY_APPLIED_ACTIVITY_PROGRESS;
  try {
    const parsed = progressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_APPLIED_ACTIVITY_PROGRESS;
  } catch {
    return EMPTY_APPLIED_ACTIVITY_PROGRESS;
  }
}

export function recordAppliedActivityAttempt(
  progress: AppliedActivityProgress,
  attempt: AppliedActivityAttempt,
): AppliedActivityProgress {
  const parsedAttempt = attemptSchema.parse(attempt);
  const entries = Object.entries({
    ...progress.attempts,
    [parsedAttempt.activityId]: parsedAttempt,
  })
    .sort((left, right) => {
      const leftDate = left[1].completedAt ?? "";
      const rightDate = right[1].completedAt ?? "";
      return (
        rightDate.localeCompare(leftDate) ||
        left[0].localeCompare(right[0])
      );
    })
    .slice(0, 80);
  return progressSchema.parse({
    version: 1,
    attempts: Object.fromEntries(entries),
  });
}

export function serializeAppliedActivityProgress(
  progress: AppliedActivityProgress,
) {
  return JSON.stringify(progressSchema.parse(progress));
}
