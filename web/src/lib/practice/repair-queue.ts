import { z } from "zod";

import { withBrowserStorageLock } from "./browser-storage-lock";
import type { Rating } from "./scheduler";

export const RECALL_REPAIR_QUEUE_VERSION = 1 as const;
export const RECALL_REPAIR_CHANGED_EVENT =
  "recall:repair-queue-changed";

const repairItemSchema = z.object({
  questionId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  questionVersion: z.number().int().positive(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  historyResetToken: z.string().uuid().nullable().default(null),
  attempts: z.number().int().min(0).max(6),
  dueAfterCard: z.number().int().nonnegative(),
  enqueuedAt: z.string().datetime({ offset: true }),
  lastRating: z.enum(["again", "hard"]),
});
export type RecallRepairItem = z.infer<typeof repairItemSchema>;

export const recallRepairQueueSchema = z.object({
  version: z.literal(RECALL_REPAIR_QUEUE_VERSION),
  cardsSeen: z.number().int().nonnegative(),
  items: z.array(repairItemSchema).max(50),
});
export type RecallRepairQueue = z.infer<
  typeof recallRepairQueueSchema
>;

export type RecallRepairQuestionIdentity = {
  version: number;
  sourceHash: string;
  historyResetToken: string | null;
};

export const EMPTY_RECALL_REPAIR_QUEUE: RecallRepairQueue = {
  version: RECALL_REPAIR_QUEUE_VERSION,
  cardsSeen: 0,
  items: [],
};

export function recallRepairStorageKey(accountId: string | null) {
  return accountId
    ? `recall:repair-queue:${z.string().uuid().parse(accountId)}:v1`
    : "recall:repair-queue:local:v1";
}

export function parseRecallRepairQueue(
  raw: string | null,
): RecallRepairQueue {
  if (!raw) return EMPTY_RECALL_REPAIR_QUEUE;
  try {
    const parsed = recallRepairQueueSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_RECALL_REPAIR_QUEUE;
  } catch {
    return EMPTY_RECALL_REPAIR_QUEUE;
  }
}

export function serializeRecallRepairQueue(
  queue: RecallRepairQueue,
) {
  return JSON.stringify(recallRepairQueueSchema.parse(queue));
}

export function enqueueRecallRepair(
  queue: RecallRepairQueue,
  {
    questionId,
    questionVersion,
    sourceHash,
    historyResetToken = null,
    rating,
    now,
  }: {
    questionId: string;
    questionVersion: number;
    sourceHash: string;
    historyResetToken?: string | null;
    rating: Extract<Rating, "again" | "hard">;
    now: string;
  },
) {
  const existing = queue.items.find(
    (item) => item.questionId === questionId,
  );
  const distance = rating === "again" ? 3 : 5;
  const item: RecallRepairItem = {
    questionId,
    questionVersion,
    sourceHash,
    historyResetToken,
    attempts: existing?.attempts ?? 0,
    dueAfterCard: queue.cardsSeen + distance,
    enqueuedAt: existing?.enqueuedAt ?? now,
    lastRating: rating,
  };
  return recallRepairQueueSchema.parse({
    ...queue,
    items: [
      ...queue.items.filter(
        (candidate) => candidate.questionId !== questionId,
      ),
      item,
    ].slice(-50),
  });
}

export function advanceRecallRepairQueue(
  queue: RecallRepairQueue,
) {
  return recallRepairQueueSchema.parse({
    ...queue,
    cardsSeen: queue.cardsSeen + 1,
  });
}

export function alignRecallRepairQueueWithAuthoritativeReviews(
  queue: RecallRepairQueue,
  reviews: ReadonlyArray<{
    questionId: string;
    questionVersion: number;
    sourceHash: string;
    historyResetToken: string | null;
    localRating: Rating;
    rating: Rating;
    now: string;
  }>,
) {
  const reviewByQuestion = new Map(
    reviews.map((review) => [review.questionId, review]),
  );
  if (!reviewByQuestion.size) return queue;

  let aligned = recallRepairQueueSchema.parse({
    ...queue,
    items: queue.items.flatMap((item) => {
      const review = reviewByQuestion.get(item.questionId);
      if (!review) return [item];
      if (review.rating === "good" || review.rating === "easy") {
        return [];
      }
      if (
        item.questionVersion !== review.questionVersion ||
        item.sourceHash !== review.sourceHash ||
        item.historyResetToken !== review.historyResetToken
      ) {
        return [
          {
            questionId: review.questionId,
            questionVersion: review.questionVersion,
            sourceHash: review.sourceHash,
            historyResetToken: review.historyResetToken,
            attempts: 0,
            dueAfterCard:
              queue.cardsSeen +
              (review.rating === "again" ? 3 : 5),
            enqueuedAt: review.now,
            lastRating: review.rating,
          },
        ];
      }

      // A repair attempt is local, same-session evidence that happened after
      // the daily review. Do not let a delayed cloud response rewind it.
      if (
        item.attempts > 0 ||
        item.lastRating === review.rating
      ) {
        return [item];
      }

      const previousDistance = item.lastRating === "again" ? 3 : 5;
      const nextDistance = review.rating === "again" ? 3 : 5;
      return [
        {
          ...item,
          dueAfterCard: Math.max(
            queue.cardsSeen,
            item.dueAfterCard - previousDistance + nextDistance,
          ),
          lastRating: review.rating,
        },
      ];
    }),
  });

  for (const review of reviewByQuestion.values()) {
    if (
      review.rating === "good" ||
      review.rating === "easy" ||
      (review.localRating !== "good" &&
        review.localRating !== "easy") ||
      aligned.items.some(
        (item) => item.questionId === review.questionId,
      )
    ) {
      continue;
    }
    aligned = enqueueRecallRepair(aligned, {
      ...review,
      rating: review.rating,
    });
  }

  return aligned;
}

export function nextRecallRepair(
  queue: RecallRepairQueue,
  validQuestions: ReadonlyMap<
    string,
    RecallRepairQuestionIdentity
  >,
  { allowEarly = false }: { allowEarly?: boolean } = {},
) {
  return (
    queue.items
      .filter((item) => {
        const current = validQuestions.get(item.questionId);
        return (
          current?.version === item.questionVersion &&
          current.sourceHash === item.sourceHash &&
          current.historyResetToken === item.historyResetToken &&
          (allowEarly || item.dueAfterCard <= queue.cardsSeen)
        );
      })
      .sort(
        (left, right) =>
          left.dueAfterCard - right.dueAfterCard ||
          left.enqueuedAt.localeCompare(right.enqueuedAt) ||
          left.questionId.localeCompare(right.questionId),
      )[0] ?? null
  );
}

export function rateRecallRepair(
  queue: RecallRepairQueue,
  questionId: string,
  rating: Rating,
) {
  const item = queue.items.find(
    (candidate) => candidate.questionId === questionId,
  );
  if (!item) return queue;
  if (rating === "good" || rating === "easy") {
    return recallRepairQueueSchema.parse({
      ...queue,
      cardsSeen: queue.cardsSeen + 1,
      items: queue.items.filter(
        (candidate) => candidate.questionId !== questionId,
      ),
    });
  }
  const attempts = Math.min(6, item.attempts + 1);
  const distance =
    rating === "again" ? Math.min(5, 2 + attempts) : 4;
  return recallRepairQueueSchema.parse({
    ...queue,
    cardsSeen: queue.cardsSeen + 1,
    items: queue.items.map((candidate) =>
      candidate.questionId === questionId
        ? {
            ...candidate,
            attempts,
            dueAfterCard: queue.cardsSeen + 1 + distance,
            lastRating: rating,
          }
        : candidate,
    ),
  });
}

export function reconcileRecallRepairQueue(
  queue: RecallRepairQueue,
  validQuestions: ReadonlyMap<
    string,
    RecallRepairQuestionIdentity
  >,
) {
  return recallRepairQueueSchema.parse({
    ...queue,
    items: queue.items.filter((item) => {
      const current = validQuestions.get(item.questionId);
      return (
        current?.version === item.questionVersion &&
        current.sourceHash === item.sourceHash &&
        current.historyResetToken === item.historyResetToken
      );
    }),
  });
}

export function readRecallRepairQueue(accountId: string | null) {
  if (typeof window === "undefined") return EMPTY_RECALL_REPAIR_QUEUE;
  try {
    return parseRecallRepairQueue(
      window.localStorage.getItem(recallRepairStorageKey(accountId)),
    );
  } catch {
    return EMPTY_RECALL_REPAIR_QUEUE;
  }
}

export function writeRecallRepairQueue(
  accountId: string | null,
  queue: RecallRepairQueue,
  runtime: RecallRepairWriteRuntime = browserRecallRepairRuntime(),
) {
  const validated = recallRepairQueueSchema.parse(queue);
  runtime.write(
    recallRepairStorageKey(accountId),
    serializeRecallRepairQueue(validated),
  );
  runtime.notify(accountId);
  return validated;
}

export function updateRecallRepairQueue(
  accountId: string | null,
  update: (current: RecallRepairQueue) => RecallRepairQueue,
  runtime: RecallRepairWriteRuntime = browserRecallRepairRuntime(),
) {
  const storageKey = recallRepairStorageKey(accountId);
  const current = parseRecallRepairQueue(runtime.read(storageKey));
  const next = recallRepairQueueSchema.parse(update(current));
  runtime.write(storageKey, serializeRecallRepairQueue(next));
  runtime.notify(accountId);
  return next;
}

export function updateRecallRepairQueueLocked(
  accountId: string | null,
  update: (current: RecallRepairQueue) => RecallRepairQueue,
) {
  return withBrowserStorageLock(
    recallRepairStorageKey(accountId),
    () => updateRecallRepairQueue(accountId, update),
  );
}

export type RecallRepairWriteRuntime = {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
  notify: (accountId: string | null) => void;
};

function browserRecallRepairRuntime(): RecallRepairWriteRuntime {
  return {
    read: (key) => window.localStorage.getItem(key),
    write: (key, value) => window.localStorage.setItem(key, value),
    notify: (accountId) =>
      window.dispatchEvent(
        new CustomEvent(RECALL_REPAIR_CHANGED_EVENT, {
          detail: { accountId },
        }),
      ),
  };
}

export function subscribeToRecallRepairQueue(
  accountId: string | null,
  callback: () => void,
) {
  const storageKey = recallRepairStorageKey(accountId);
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
  window.addEventListener(RECALL_REPAIR_CHANGED_EVENT, onChanged);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(RECALL_REPAIR_CHANGED_EVENT, onChanged);
  };
}
