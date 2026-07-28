import { describe, expect, it } from "vitest";

import {
  EMPTY_RECALL_REPAIR_QUEUE,
  advanceRecallRepairQueue,
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
};
const valid = new Map([
  [
    identity.questionId,
    {
      version: identity.questionVersion,
      sourceHash: identity.sourceHash,
    },
  ],
]);

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
            { version: 3, sourceHash: "b".repeat(64) },
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
