import { afterEach, describe, expect, it, vi } from "vitest";

import type { BrowserLockManager } from "./browser-storage-lock";
import {
  recordScheduledReview,
} from "./learning-state";
import { parseProgress, type Review } from "./scheduler";
import {
  acknowledgePracticeRepairSnapshotLocked,
  mutatePracticeProgressSnapshotLocked,
  practiceProgressStorageKey,
  readPracticeProgressSnapshot,
  recordPracticeReviewSnapshotLocked,
} from "./storage";

const accountId = "10000000-0000-4000-8000-000000000001";
const sourceHashA = "a".repeat(64);
const sourceHashB = "b".repeat(64);
const currentIdentity = {
  questionVersion: 1,
  sourceHash: sourceHashA,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("locked practice progress mutations", () => {
  it("serializes two stale-tab reviews and preserves both", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", new BrowserWindow(storage));
    const lockNames: string[] = [];
    let queue = Promise.resolve();
    const lockManager: BrowserLockManager = {
      request: (name, _options, callback) => {
        lockNames.push(name);
        const result = queue.then(callback);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    };

    await Promise.all([
      persistReview(review("question-a"), lockManager),
      persistReview(review("question-b"), lockManager),
    ]);

    expect(
      parseProgress(
        readPracticeProgressSnapshot(accountId),
      ).reviews.map((item) => item.questionId),
    ).toEqual(["question-a", "question-b"]);
    expect(new Set(lockNames)).toEqual(
      new Set([
        `recall:storage:${practiceProgressStorageKey(accountId)}`,
      ]),
    );
  });

  it("rereads synchronously before each fallback mutation", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", new BrowserWindow(storage));

    const first = persistReview(review("question-a"), null);
    const second = persistReview(review("question-b"), null);
    await Promise.all([first, second]);

    expect(
      parseProgress(
        readPracticeProgressSnapshot(accountId),
      ).reviews.map((item) => item.questionId),
    ).toEqual(["question-a", "question-b"]);
  });

  it("keeps the first same-question daily rating under the lock", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", new BrowserWindow(storage));
    let queue = Promise.resolve();
    const lockManager: BrowserLockManager = {
      request: (_name, _options, callback) => {
        const result = queue.then(callback);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    };
    const goodFactory = vi.fn(() => review("question-a", "good"));
    const againFactory = vi.fn(() => review("question-a", "again"));

    const results = await Promise.all([
      recordPracticeReviewSnapshotLocked(
        accountId,
        {
          questionId: "question-a",
          ...currentIdentity,
          reviewedOn: "2026-07-30",
          createReview: goodFactory,
        },
        lockManager,
      ),
      recordPracticeReviewSnapshotLocked(
        accountId,
        {
          questionId: "question-a",
          ...currentIdentity,
          reviewedOn: "2026-07-30",
          createReview: againFactory,
        },
        lockManager,
      ),
    ]);

    expect(results.map((result) => result.status)).toEqual([
      "recorded",
      "already_recorded",
    ]);
    expect(goodFactory).toHaveBeenCalledTimes(1);
    expect(againFactory).not.toHaveBeenCalled();
    expect(
      parseProgress(readPracticeProgressSnapshot(accountId)).reviews,
    ).toEqual([review("question-a", "good")]);
  });

  it.each([
    {
      label: "an older question version",
      storedIdentity: {
        questionVersion: 1,
        sourceHash: sourceHashA,
      },
      currentIdentity: {
        questionVersion: 2,
        sourceHash: sourceHashB,
      },
    },
    {
      label: "another source hash",
      storedIdentity: {
        questionVersion: 2,
        sourceHash: sourceHashA,
      },
      currentIdentity: {
        questionVersion: 2,
        sourceHash: sourceHashB,
      },
    },
  ])(
    "replaces a same-day review from $label",
    async ({ storedIdentity, currentIdentity: expectedIdentity }) => {
      const storage = new MemoryStorage();
      vi.stubGlobal("window", new BrowserWindow(storage));
      const stale = review("question-a", "good", storedIdentity);
      storage.setItem(
        practiceProgressStorageKey(accountId),
        JSON.stringify({ version: 1, reviews: [stale] }),
      );
      const replacement = review(
        "question-a",
        "again",
        expectedIdentity,
      );
      const factory = vi.fn((current: ReturnType<typeof parseProgress>) => {
        expect(current.reviews).toEqual([]);
        return replacement;
      });

      const result = await recordPracticeReviewSnapshotLocked(
        accountId,
        {
          questionId: "question-a",
          ...expectedIdentity,
          reviewedOn: "2026-07-30",
          createReview: factory,
        },
        null,
      );

      expect(result.status).toBe("recorded");
      expect(factory).toHaveBeenCalledTimes(1);
      expect(
        parseProgress(readPracticeProgressSnapshot(accountId)).reviews,
      ).toEqual([replacement]);
    },
  );

  it("replaces a legacy same-day review whose content identity is unknown", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", new BrowserWindow(storage));
    const legacy: Review = {
      questionId: "question-a",
      reviewedOn: "2026-07-30",
      rating: "good",
      nextDueOn: "2026-08-02",
    };
    storage.setItem(
      practiceProgressStorageKey(accountId),
      JSON.stringify({ version: 1, reviews: [legacy] }),
    );
    const replacement = review("question-a", "hard");
    const factory = vi.fn((current: ReturnType<typeof parseProgress>) => {
      expect(current.reviews).toEqual([]);
      return replacement;
    });

    const result = await recordPracticeReviewSnapshotLocked(
      accountId,
      {
        questionId: "question-a",
        ...currentIdentity,
        reviewedOn: "2026-07-30",
        createReview: factory,
      },
      null,
    );

    expect(result.status).toBe("recorded");
    expect(factory).toHaveBeenCalledTimes(1);
    expect(
      parseProgress(readPracticeProgressSnapshot(accountId)).reviews,
    ).toEqual([replacement]);
  });

  it("rejects a factory result that is not bound to the expected identity", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", new BrowserWindow(storage));

    await expect(
      recordPracticeReviewSnapshotLocked(
        accountId,
        {
          questionId: "question-a",
          questionVersion: 2,
          sourceHash: sourceHashB,
          reviewedOn: "2026-07-30",
          createReview: () => review("question-a"),
        },
        null,
      ),
    ).rejects.toThrow(
      "Practice review factory returned an invalid review",
    );
    expect(
      parseProgress(readPracticeProgressSnapshot(accountId)).reviews,
    ).toEqual([]);
  });

  it("makes the locked factory schedule from prepared current progress", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", new BrowserWindow(storage));
    const previous = {
      ...review("question-a", "hard"),
      reviewedOn: "2026-07-29",
      nextDueOn: "2026-07-31",
    };
    storage.setItem(
      practiceProgressStorageKey(accountId),
      JSON.stringify({ version: 1, reviews: [previous] }),
    );
    const factory = vi.fn((current) => {
      expect(current.reviews).toEqual([previous]);
      return review("question-a", "good");
    });

    await recordPracticeReviewSnapshotLocked(
      accountId,
      {
        questionId: "question-a",
        ...currentIdentity,
        reviewedOn: "2026-07-30",
        prepareProgress: (stored) => stored,
        createReview: factory,
      },
      null,
    );

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("clears only the exact repair journal marker after queue persistence", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", new BrowserWindow(storage));
    const pending = {
      ...review("question-a", "again"),
      repairPendingAt: "2026-07-30T08:30:00.000Z",
    };
    storage.setItem(
      practiceProgressStorageKey(accountId),
      JSON.stringify({ version: 1, reviews: [pending] }),
    );

    await acknowledgePracticeRepairSnapshotLocked(
      accountId,
      {
        questionId: pending.questionId,
        reviewedOn: pending.reviewedOn,
        repairPendingAt: "2026-07-30T08:31:00.000Z",
      },
      null,
    );
    expect(
      parseProgress(readPracticeProgressSnapshot(accountId)).reviews[0]
        ?.repairPendingAt,
    ).toBe(pending.repairPendingAt);

    await acknowledgePracticeRepairSnapshotLocked(
      accountId,
      {
        questionId: pending.questionId,
        reviewedOn: pending.reviewedOn,
        repairPendingAt: pending.repairPendingAt,
      },
      null,
    );
    expect(
      parseProgress(readPracticeProgressSnapshot(accountId)).reviews[0],
    ).not.toHaveProperty("repairPendingAt");
  });
});

function persistReview(
  nextReview: Review,
  lockManager: BrowserLockManager | null,
) {
  return mutatePracticeProgressSnapshotLocked(
    accountId,
    (current) => recordScheduledReview(current, nextReview),
    lockManager,
  );
}

function review(
  questionId: string,
  rating: Review["rating"] = "good",
  identity: Pick<Review, "questionVersion" | "sourceHash"> =
    currentIdentity,
): Review {
  return {
    questionId,
    ...identity,
    reviewedOn: "2026-07-30",
    rating,
    nextDueOn: "2026-08-02",
    stateAfter:
      rating === "again" || rating === "hard" ? "learning" : "review",
    intervalDaysAfter: 3,
    lapseCountAfter: 0,
  };
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class BrowserWindow extends EventTarget {
  constructor(readonly localStorage: Storage) {
    super();
  }
}
