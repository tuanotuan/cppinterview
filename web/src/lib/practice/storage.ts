import { z } from "zod";

import {
  withBrowserStorageLock,
  type BrowserLockManager,
} from "./browser-storage-lock";
import {
  parseProgress,
  type PracticeProgress,
  type Review,
} from "./scheduler";

export const EMPTY_PROGRESS_STORAGE_SNAPSHOT = "__empty__";

const PRACTICE_PROGRESS_CHANGED_EVENT = "recall:practice-progress-changed";

export function practiceProgressStorageKey(accountId: string | null) {
  const scope = accountId ? z.string().uuid().parse(accountId) : "local";
  return `cpp-recall:progress:${scope}:v2`;
}

export function readPracticeProgressSnapshot(accountId: string | null) {
  try {
    return (
      window.localStorage.getItem(practiceProgressStorageKey(accountId)) ??
      EMPTY_PROGRESS_STORAGE_SNAPSHOT
    );
  } catch {
    return EMPTY_PROGRESS_STORAGE_SNAPSHOT;
  }
}

export function writePracticeProgressSnapshot(
  accountId: string | null,
  raw: string,
) {
  const storageKey = practiceProgressStorageKey(accountId);
  writePracticeProgressStorageKey(storageKey, raw);
}

export function mutatePracticeProgressSnapshotLocked(
  accountId: string | null,
  mutation: (current: PracticeProgress) => PracticeProgress,
  lockManager?: BrowserLockManager | null,
) {
  const storageKey = practiceProgressStorageKey(accountId);
  return withBrowserStorageLock(
    storageKey,
    () => {
      const current = parseProgress(
        window.localStorage.getItem(storageKey),
      );
      const next = mutation(current);
      const serialized = JSON.stringify(next);
      const normalized = parseProgress(serialized);
      writePracticeProgressStorageKey(
        storageKey,
        JSON.stringify(normalized),
      );
      return normalized;
    },
    lockManager,
  );
}

export function recordPracticeReviewSnapshotLocked(
  accountId: string | null,
  input: {
    questionId: string;
    questionVersion: number;
    sourceHash: string;
    reviewedOn: string;
    prepareProgress?: (stored: PracticeProgress) => PracticeProgress;
    createReview: (current: PracticeProgress) => Review;
  },
  lockManager?: BrowserLockManager | null,
) {
  const storageKey = practiceProgressStorageKey(accountId);
  return withBrowserStorageLock(
    storageKey,
    () => {
      const stored = parseProgress(window.localStorage.getItem(storageKey));
      const prepared = input.prepareProgress
        ? input.prepareProgress(stored)
        : stored;
      const current = parseProgress(JSON.stringify(prepared));
      const existing = current.reviews.find(
        (review) =>
          review.questionId === input.questionId &&
          review.reviewedOn === input.reviewedOn &&
          review.questionVersion === input.questionVersion &&
          review.sourceHash === input.sourceHash,
      );
      if (existing) {
        writePracticeProgressStorageKey(
          storageKey,
          JSON.stringify(current),
        );
        return {
          status: "already_recorded" as const,
          progress: current,
          review: existing,
        };
      }

      // A same-day review for another content identity cannot authoritatively
      // rate the current question. Legacy reviews without identity metadata are
      // also replaceable because treating them as current would let unknown old
      // content block the learner after a content update.
      const progressForCurrentIdentity = {
        ...current,
        reviews: current.reviews.filter(
          (review) =>
            review.questionId !== input.questionId ||
            review.reviewedOn !== input.reviewedOn,
        ),
      };
      const review = input.createReview(progressForCurrentIdentity);
      const normalizedReview = parseProgress(
        JSON.stringify({
          version: current.version,
          reviews: [review],
        }),
      ).reviews[0];
      if (
        !normalizedReview ||
        normalizedReview.questionId !== input.questionId ||
        normalizedReview.reviewedOn !== input.reviewedOn ||
        normalizedReview.questionVersion !== input.questionVersion ||
        normalizedReview.sourceHash !== input.sourceHash
      ) {
        throw new Error("Practice review factory returned an invalid review");
      }

      const next = parseProgress(
        JSON.stringify({
          version: current.version,
          reviews: [
            ...progressForCurrentIdentity.reviews,
            normalizedReview,
          ],
        }),
      );
      writePracticeProgressStorageKey(storageKey, JSON.stringify(next));
      return {
        status: "recorded" as const,
        progress: next,
        review: normalizedReview,
      };
    },
    lockManager,
  );
}

export function acknowledgePracticeRepairSnapshotLocked(
  accountId: string | null,
  marker: {
    questionId: string;
    reviewedOn: string;
    repairPendingAt: string;
  },
  lockManager?: BrowserLockManager | null,
) {
  return mutatePracticeProgressSnapshotLocked(
    accountId,
    (current) => ({
      ...current,
      reviews: current.reviews.map((review) => {
        if (
          review.questionId !== marker.questionId ||
          review.reviewedOn !== marker.reviewedOn ||
          review.repairPendingAt !== marker.repairPendingAt
        ) {
          return review;
        }
        const acknowledged = { ...review };
        delete acknowledged.repairPendingAt;
        return acknowledged;
      }),
    }),
    lockManager,
  );
}

function writePracticeProgressStorageKey(
  storageKey: string,
  raw: string,
) {
  window.localStorage.setItem(storageKey, raw);
  window.dispatchEvent(
    new CustomEvent(PRACTICE_PROGRESS_CHANGED_EVENT, {
      detail: { storageKey },
    }),
  );
}

export function subscribeToPracticeProgress(
  accountId: string | null,
  callback: () => void,
) {
  const storageKey = practiceProgressStorageKey(accountId);
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      event.key === storageKey
    ) {
      callback();
    }
  };
  const onChanged = (event: Event) => {
    const detail = (
      event as CustomEvent<{ storageKey?: string }>
    ).detail;
    if (detail?.storageKey === storageKey) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PRACTICE_PROGRESS_CHANGED_EVENT, onChanged);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PRACTICE_PROGRESS_CHANGED_EVENT, onChanged);
  };
}
