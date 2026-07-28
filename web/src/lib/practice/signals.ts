import { z } from "zod";

import { withBrowserStorageLock } from "./browser-storage-lock";
import type { Rating } from "./scheduler";

export const PRACTICE_SIGNAL_VERSION = 1 as const;
export const PRACTICE_SIGNALS_CHANGED_EVENT =
  "recall:practice-signals-changed";

export const practiceAttemptSignalSchema = z.object({
  eventId: z.string().uuid(),
  questionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  questionVersion: z.number().int().positive(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  occurredAt: z.string().datetime({ offset: true }),
  mode: z.enum(["scheduled", "repair"]),
  rating: z.enum(["again", "hard", "good", "easy"]),
  confidencePercent: z.number().int().min(0).max(100).nullable(),
  responseTimeMs: z.number().int().min(0).max(4 * 60 * 60 * 1000),
  hintUsed: z.boolean(),
  answerRevealed: z.boolean(),
  coachFeedbackUsed: z.boolean().default(false),
  coachScore: z.number().int().min(0).max(100).nullable(),
  outcome: z.enum(["incorrect", "partial", "correct"]),
});
export type PracticeAttemptSignal = z.infer<
  typeof practiceAttemptSignalSchema
>;

export const practiceSignalStoreSchema = z.object({
  version: z.literal(PRACTICE_SIGNAL_VERSION),
  events: z.array(practiceAttemptSignalSchema).max(2000),
});
export type PracticeSignalStore = z.infer<
  typeof practiceSignalStoreSchema
>;

export const EMPTY_PRACTICE_SIGNAL_STORE: PracticeSignalStore = {
  version: PRACTICE_SIGNAL_VERSION,
  events: [],
};

export type CalibrationBucket = {
  lower: number;
  upper: number;
  count: number;
  averageConfidence: number | null;
  accuracyPercent: number | null;
};

export type CalibrationSummary = {
  eventCount: number;
  calibratedEventCount: number;
  averageConfidence: number | null;
  accuracyPercent: number | null;
  expectedCalibrationError: number | null;
  highConfidenceMistakes: number;
  buckets: CalibrationBucket[];
};

export function practiceSignalStorageKey(accountId: string | null) {
  return accountId
    ? `recall:practice-signals:${z.string().uuid().parse(accountId)}:v1`
    : "recall:practice-signals:local:v1";
}

export function parsePracticeSignalStore(
  raw: string | null,
): PracticeSignalStore {
  if (!raw) return EMPTY_PRACTICE_SIGNAL_STORE;
  try {
    const parsed = practiceSignalStoreSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_PRACTICE_SIGNAL_STORE;
  } catch {
    return EMPTY_PRACTICE_SIGNAL_STORE;
  }
}

export function serializePracticeSignalStore(
  store: PracticeSignalStore,
) {
  return JSON.stringify(practiceSignalStoreSchema.parse(store));
}

export function recordPracticeAttemptSignal(
  store: PracticeSignalStore,
  event: PracticeAttemptSignal,
) {
  const validated = practiceAttemptSignalSchema.parse(event);
  return practiceSignalStoreSchema.parse({
    ...store,
    events: [
      ...store.events.filter(
        (candidate) => candidate.eventId !== validated.eventId,
      ),
      validated,
    ]
      .sort(comparePracticeSignals)
      .slice(-2000),
  });
}

export function mergePracticeSignalStores(
  persisted: PracticeSignalStore,
  incoming: PracticeSignalStore,
) {
  const current = practiceSignalStoreSchema.parse(persisted);
  const next = practiceSignalStoreSchema.parse(incoming);
  const byEventId = new Map(
    current.events.map((event) => [event.eventId, event]),
  );
  for (const event of next.events) {
    // Signals are immutable events. The first persisted payload wins if a
    // stale tab reuses an eventId with different data.
    if (!byEventId.has(event.eventId)) {
      byEventId.set(event.eventId, event);
    }
  }
  return practiceSignalStoreSchema.parse({
    version: PRACTICE_SIGNAL_VERSION,
    events: [...byEventId.values()]
      .sort(comparePracticeSignals)
      .slice(-2000),
  });
}

export function outcomeForReview({
  rating,
  coachScore,
}: {
  rating: Rating;
  coachScore?: number | null;
}): PracticeAttemptSignal["outcome"] {
  if (coachScore !== null && coachScore !== undefined) {
    if (coachScore >= 75) return "correct";
    if (coachScore >= 45) return "partial";
    return "incorrect";
  }
  if (rating === "good" || rating === "easy") return "correct";
  if (rating === "hard") return "partial";
  return "incorrect";
}

export function buildCalibrationSummary(
  events: readonly PracticeAttemptSignal[],
): CalibrationSummary {
  const calibrated = events.filter(
    (
      event,
    ): event is PracticeAttemptSignal & {
      confidencePercent: number;
    } => event.confidencePercent !== null,
  );
  const ranges = [
    [0, 20],
    [21, 40],
    [41, 60],
    [61, 80],
    [81, 100],
  ] as const;
  const buckets = ranges.map(([lower, upper]) => {
    const bucketEvents = calibrated.filter(
      (event) =>
        event.confidencePercent >= lower &&
        event.confidencePercent <= upper,
    );
    return {
      lower,
      upper,
      count: bucketEvents.length,
      averageConfidence: average(
        bucketEvents.map((event) => event.confidencePercent),
      ),
      accuracyPercent: average(
        bucketEvents.map((event) =>
          event.outcome === "correct" ? 100 : 0,
        ),
      ),
    };
  });
  const total = calibrated.length;
  const expectedCalibrationError =
    total === 0
      ? null
      : Math.round(
          buckets.reduce((sum, bucket) => {
            if (
              bucket.count === 0 ||
              bucket.averageConfidence === null ||
              bucket.accuracyPercent === null
            ) {
              return sum;
            }
            return (
              sum +
              (bucket.count / total) *
                Math.abs(
                  bucket.averageConfidence - bucket.accuracyPercent,
                )
            );
          }, 0),
        );
  return {
    eventCount: events.length,
    calibratedEventCount: total,
    averageConfidence: average(
      calibrated.map((event) => event.confidencePercent),
    ),
    accuracyPercent: average(
      calibrated.map((event) =>
        event.outcome === "correct" ? 100 : 0,
      ),
    ),
    expectedCalibrationError,
    highConfidenceMistakes: calibrated.filter(
      (event) =>
        event.confidencePercent >= 80 &&
        event.outcome !== "correct",
    ).length,
    buckets,
  };
}

export function readPracticeSignalStore(accountId: string | null) {
  if (typeof window === "undefined") return EMPTY_PRACTICE_SIGNAL_STORE;
  try {
    return parsePracticeSignalStore(
      window.localStorage.getItem(practiceSignalStorageKey(accountId)),
    );
  } catch {
    return EMPTY_PRACTICE_SIGNAL_STORE;
  }
}

export function writePracticeSignalStore(
  accountId: string | null,
  store: PracticeSignalStore,
  runtime: PracticeSignalWriteRuntime = browserPracticeSignalRuntime(),
) {
  const storageKey = practiceSignalStorageKey(accountId);
  const persisted = parsePracticeSignalStore(
    runtime.read(storageKey),
  );
  const merged = mergePracticeSignalStores(persisted, store);
  runtime.write(storageKey, serializePracticeSignalStore(merged));
  runtime.notify(accountId);
  return merged;
}

export function writePracticeSignalStoreLocked(
  accountId: string | null,
  store: PracticeSignalStore,
) {
  return withBrowserStorageLock(
    practiceSignalStorageKey(accountId),
    () => writePracticeSignalStore(accountId, store),
  );
}

export type PracticeSignalWriteRuntime = {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
  notify: (accountId: string | null) => void;
};

function browserPracticeSignalRuntime(): PracticeSignalWriteRuntime {
  return {
    read: (key) => window.localStorage.getItem(key),
    write: (key, value) => window.localStorage.setItem(key, value),
    notify: (accountId) =>
      window.dispatchEvent(
        new CustomEvent(PRACTICE_SIGNALS_CHANGED_EVENT, {
          detail: { accountId },
        }),
      ),
  };
}

function comparePracticeSignals(
  left: PracticeAttemptSignal,
  right: PracticeAttemptSignal,
) {
  return (
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.eventId.localeCompare(right.eventId)
  );
}

export function subscribeToPracticeSignalStore(
  accountId: string | null,
  callback: () => void,
) {
  const storageKey = practiceSignalStorageKey(accountId);
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      event.key === storageKey
    ) {
      callback();
    }
  };
  const onChanged = (event: Event) => {
    if (
      event instanceof CustomEvent &&
      event.detail?.accountId === accountId
    ) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PRACTICE_SIGNALS_CHANGED_EVENT, onChanged);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PRACTICE_SIGNALS_CHANGED_EVENT, onChanged);
  };
}

function average(values: readonly number[]) {
  if (!values.length) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}
