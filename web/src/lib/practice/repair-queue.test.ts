import { describe, expect, it } from "vitest";

import {
  EMPTY_RECALL_REPAIR_QUEUE,
  advanceRecallRepairQueue,
  alignRecallRepairQueueWithAuthoritativeReviews,
  enqueueRecallRepair,
  nextRecallRepair,
  parseRecallRepairQueue,
  rateRecallRepair,
  reconcileRecallRepairQueue,
  serializeRecallRepairQueue,
  updateRecallRepairQueue,
} from "./repair-queue";

const identity = {
  questionId: "cpp-lifetime",
  questionVersion: 2,
  sourceHash: "a".repeat(64),
  historyResetToken: null,
};
const valid = new Map([
  [
    identity.questionId,
    {
      version: identity.questionVersion,
      sourceHash: identity.sourceHash,
      historyResetToken: identity.historyResetToken,
    },
  ],
]);
const resetGenerationA =
  "d89ed8d0-7b1f-4c62-9ca4-90a14b8cfa86";
const resetGenerationB =
  "a779d019-f226-4f8f-9db5-41cd44c687e9";

describe("same-session Recall Repair queue", () => {
  it("returns Again only after three intervening cards", () => {
    let queue = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });
    expect(nextRecallRepair(queue, valid)).toBeNull();
    queue = advanceRecallRepairQueue(queue);
    queue = advanceRecallRepairQueue(queue);
    expect(nextRecallRepair(queue, valid)).toBeNull();
    queue = advanceRecallRepairQueue(queue);
    expect(nextRecallRepair(queue, valid)?.questionId).toBe(
      identity.questionId,
    );
  });

  it("graduates on Good without creating a second daily review", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "hard",
      now: "2026-07-28T00:00:00.000Z",
    });
    const repaired = rateRecallRepair(
      queued,
      identity.questionId,
      "good",
    );
    expect(repaired.items).toEqual([]);
    expect(repaired).not.toHaveProperty("reviews");
  });

  it("requeues another failed repair with increasing separation", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });
    const failed = rateRecallRepair(
      queued,
      identity.questionId,
      "again",
    );
    expect(failed.items[0]).toMatchObject({
      attempts: 1,
      lastRating: "again",
    });
    expect(failed.items[0].dueAfterCard).toBeGreaterThan(
      failed.cardsSeen,
    );
  });

  it("removes a failed local repair when another device's Good rating won", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });

    const aligned = alignRecallRepairQueueWithAuthoritativeReviews(
      queued,
      [
        {
          ...identity,
          localRating: "again",
          rating: "good",
          now: "2026-07-28T00:01:00.000Z",
        },
      ],
    );

    expect(aligned.items).toEqual([]);
    expect(aligned.cardsSeen).toBe(queued.cardsSeen);
  });

  it("aligns an unattempted repair with the server-winning failed rating", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });

    const aligned = alignRecallRepairQueueWithAuthoritativeReviews(
      queued,
      [
        {
          ...identity,
          localRating: "again",
          rating: "hard",
          now: "2026-07-28T00:01:00.000Z",
        },
      ],
    );

    expect(aligned.items[0]).toMatchObject({
      questionId: identity.questionId,
      lastRating: "hard",
      attempts: 0,
    });
    expect(aligned.items[0].dueAfterCard).toBe(
      queued.items[0].dueAfterCard + 2,
    );
    expect(aligned.cardsSeen).toBe(queued.cardsSeen);
  });

  it("does not rewind a later same-session repair attempt", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });
    const repaired = rateRecallRepair(
      queued,
      identity.questionId,
      "hard",
    );

    expect(
      alignRecallRepairQueueWithAuthoritativeReviews(repaired, [
        {
          ...identity,
          localRating: "again",
          rating: "again",
          now: "2026-07-28T00:01:00.000Z",
        },
      ]),
    ).toEqual(repaired);
  });

  it("creates a missing repair when another device's Hard rating won", () => {
    const aligned = alignRecallRepairQueueWithAuthoritativeReviews(
      EMPTY_RECALL_REPAIR_QUEUE,
      [
        {
          ...identity,
          localRating: "good",
          rating: "hard",
          now: "2026-07-28T00:01:00.000Z",
        },
      ],
    );

    expect(aligned.items[0]).toMatchObject({
      ...identity,
      lastRating: "hard",
      attempts: 0,
    });
    expect(aligned.cardsSeen).toBe(0);
  });

  it("replaces a stale identity before applying a failed server winner", () => {
    const stale = enqueueRecallRepair(
      EMPTY_RECALL_REPAIR_QUEUE,
      {
        ...identity,
        questionVersion: 1,
        sourceHash: "b".repeat(64),
        rating: "again",
        now: "2026-07-28T00:00:00.000Z",
      },
    );

    const aligned = alignRecallRepairQueueWithAuthoritativeReviews(
      stale,
      [
        {
          ...identity,
          localRating: "again",
          rating: "hard",
          now: "2026-07-28T00:01:00.000Z",
        },
      ],
    );

    expect(aligned.items).toHaveLength(1);
    expect(aligned.items[0]).toMatchObject({
      ...identity,
      lastRating: "hard",
      attempts: 0,
    });
  });

  it("does not resurrect a repair completed before cloud sync returns", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });
    const completed = rateRecallRepair(
      queued,
      identity.questionId,
      "good",
    );

    expect(
      alignRecallRepairQueueWithAuthoritativeReviews(completed, [
        {
          ...identity,
          localRating: "again",
          rating: "again",
          now: "2026-07-28T00:01:00.000Z",
        },
      ]),
    ).toEqual(completed);
  });

  it("drops a repair created before the current history reset generation", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      historyResetToken: resetGenerationA,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });
    const currentGeneration = new Map([
      [
        identity.questionId,
        {
          version: identity.questionVersion,
          sourceHash: identity.sourceHash,
          historyResetToken: resetGenerationB,
        },
      ],
    ]);

    expect(
      nextRecallRepair(queued, currentGeneration, {
        allowEarly: true,
      }),
    ).toBeNull();
    expect(
      reconcileRecallRepairQueue(queued, currentGeneration).items,
    ).toEqual([]);
  });

  it("replaces a stale generation with the authoritative failed review", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      historyResetToken: resetGenerationA,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });

    const aligned = alignRecallRepairQueueWithAuthoritativeReviews(
      queued,
      [
        {
          ...identity,
          historyResetToken: resetGenerationB,
          localRating: "again",
          rating: "hard",
          now: "2026-07-28T00:01:00.000Z",
        },
      ],
    );

    expect(aligned.items).toHaveLength(1);
    expect(aligned.items[0]).toMatchObject({
      historyResetToken: resetGenerationB,
      lastRating: "hard",
      attempts: 0,
    });
  });

  it("drops stale question versions and can surface early when normal queue is empty", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "hard",
      now: "2026-07-28T00:00:00.000Z",
    });
    expect(
      nextRecallRepair(queued, valid, { allowEarly: true })?.questionId,
    ).toBe(identity.questionId);
    expect(
      reconcileRecallRepairQueue(
        queued,
        new Map([
          [
            identity.questionId,
            {
              version: 3,
              sourceHash: "b".repeat(64),
              historyResetToken: null,
            },
          ],
        ]),
      ).items,
    ).toEqual([]);
  });

  it("round-trips valid state and fails closed on corrupt storage", () => {
    const queued = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });
    expect(
      parseRecallRepairQueue(serializeRecallRepairQueue(queued)),
    ).toEqual(queued);
    expect(parseRecallRepairQueue("nope")).toEqual(
      EMPTY_RECALL_REPAIR_QUEUE,
    );
  });

  it("normalizes legacy queue items to the pre-reset generation", () => {
    const parsed = parseRecallRepairQueue(
      JSON.stringify({
        version: 1,
        cardsSeen: 0,
        items: [
          {
            questionId: identity.questionId,
            questionVersion: identity.questionVersion,
            sourceHash: identity.sourceHash,
            attempts: 0,
            dueAfterCard: 3,
            enqueuedAt: "2026-07-28T00:00:00.000Z",
            lastRating: "again",
          },
        ],
      }),
    );

    expect(parsed.items[0]?.historyResetToken).toBeNull();
  });

  it("rereads persisted state before applying an atomic-ish update", () => {
    const first = enqueueRecallRepair(EMPTY_RECALL_REPAIR_QUEUE, {
      ...identity,
      rating: "again",
      now: "2026-07-28T00:00:00.000Z",
    });
    let raw = serializeRecallRepairQueue(first);
    const notices: Array<string | null> = [];
    const secondIdentity = {
      questionId: "cpp-containers",
      questionVersion: 1,
      sourceHash: "b".repeat(64),
      historyResetToken: null,
    };
    const updated = updateRecallRepairQueue(
      null,
      (current) =>
        enqueueRecallRepair(current, {
          ...secondIdentity,
          rating: "hard",
          now: "2026-07-28T00:01:00.000Z",
        }),
      {
        read: () => raw,
        write: (_key, value) => {
          raw = value;
        },
        notify: (accountId) => notices.push(accountId),
      },
    );

    expect(updated.items.map((item) => item.questionId).sort()).toEqual(
      ["cpp-containers", "cpp-lifetime"],
    );
    expect(parseRecallRepairQueue(raw)).toEqual(updated);
    expect(notices).toEqual([null]);
  });

  it("preserves consecutive increments by rereading each update", () => {
    let raw = serializeRecallRepairQueue(
      EMPTY_RECALL_REPAIR_QUEUE,
    );
    const runtime = {
      read: () => raw,
      write: (_key: string, value: string) => {
        raw = value;
      },
      notify: () => undefined,
    };

    updateRecallRepairQueue(
      null,
      advanceRecallRepairQueue,
      runtime,
    );
    const twice = updateRecallRepairQueue(
      null,
      advanceRecallRepairQueue,
      runtime,
    );

    expect(twice.cardsSeen).toBe(2);
  });
});
