import { describe, expect, it } from "vitest";

import type { WorldQuantFocusPlan } from "../worldquant/focus-plan";

import {
  FOCUS_SESSION_STORAGE_KEY,
  completeFocusSession,
  completeFocusSessionQuestion,
  createFocusSession,
  parseFocusSession,
  parseFocusSessionId,
  reconcileFocusSession,
  sameFocusSessionRevision,
  serializeFocusSession,
} from "./focus-session";

const startedAt = "2026-07-26T02:00:00.000Z";
const later = "2026-07-26T02:10:00.000Z";
const finishedAt = "2026-07-26T02:20:00.000Z";
const sessionId = "71e8a36a-3e0f-4e2f-8b31-33293fbb4627";

const references = [
  {
    id: "cpp-relearning",
    version: 2,
    sourceHash: "a".repeat(64),
    deckId: "cpp-interview",
    estimatedMinutes: 5,
  },
  {
    id: "cpp-due",
    version: 4,
    sourceHash: "b".repeat(64),
    deckId: "cpp-interview",
    estimatedMinutes: 7,
  },
  {
    id: "cmake-new",
    version: 1,
    sourceHash: "c".repeat(64),
    deckId: "cmake-build-systems",
    estimatedMinutes: 4,
  },
] as const;

const plan: WorldQuantFocusPlan = {
  version: 1,
  profileId: "tick-data-platform",
  profileVersion: 1,
  createdOn: "2026-07-26",
  focusCompetency: null,
  requestedMinutes: 20,
  budgetCeilingMinutes: 22,
  scheduledMinutes: 16,
  questions: [
    {
      question: references[0],
      competency: "modern_cpp",
      queueReason: "due_relearning",
      evidence: 0.15,
    },
    {
      question: references[1],
      competency: "modern_cpp",
      queueReason: "due",
      evidence: 0.75,
    },
    {
      question: references[2],
      competency: "build_delivery",
      queueReason: "new",
      evidence: 0,
    },
  ],
  fallbacks: [],
};

describe("focus session persistence", () => {
  it("accepts only a real UUID as a focus URL session id", () => {
    expect(parseFocusSessionId(sessionId)).toBe(sessionId);
    expect(parseFocusSessionId("1")).toBeNull();
    expect(parseFocusSessionId("not-a-session")).toBeNull();
    expect(parseFocusSessionId(undefined)).toBeNull();
  });

  it("round-trips a versioned plan without storing question content", () => {
    expect(FOCUS_SESSION_STORAGE_KEY).toBe("recall:focus-session:v1");

    const session = createFocusSession(plan, { now: startedAt, sessionId });
    const serialized = serializeFocusSession(session);
    const restored = parseFocusSession(serialized);

    expect(restored).toEqual(session);
    expect(restored?.remainingQuestions).toEqual(references);
    expect(serialized).not.toContain("prompt");
    expect(serialized).not.toContain("answer");
  });

  it("returns null for malformed, mismatched, or injected storage", () => {
    const session = createFocusSession(plan, { now: startedAt, sessionId });
    const injected = {
      ...session,
      remainingQuestions: [
        { ...session.remainingQuestions[0], prompt: "Do not persist me" },
        ...session.remainingQuestions.slice(1),
      ],
    };

    expect(parseFocusSession(null)).toBeNull();
    expect(parseFocusSession("not-json")).toBeNull();
    expect(parseFocusSession('{"version":99}')).toBeNull();
    expect(parseFocusSession(JSON.stringify(injected))).toBeNull();
  });

  it("rejects an active empty queue and reordered stored refs", () => {
    const session = createFocusSession(plan, { now: startedAt, sessionId });

    expect(
      parseFocusSession(
        JSON.stringify({
          ...session,
          remainingQuestions: [],
        }),
      ),
    ).toBeNull();
    expect(
      parseFocusSession(
        JSON.stringify({
          ...session,
          remainingQuestions: [...session.remainingQuestions].reverse(),
        }),
      ),
    ).toBeNull();
  });

  it("resumes the remaining queue in its original order", () => {
    const session = createFocusSession(plan, { now: startedAt, sessionId });
    const progressed = completeFocusSessionQuestion(
      session,
      references[0].id,
      later,
    );
    const restored = parseFocusSession(serializeFocusSession(progressed));

    expect(restored?.remainingQuestions.map(({ id }) => id)).toEqual([
      references[1].id,
      references[2].id,
    ]);
    expect(restored?.completedQuestions.map(({ id }) => id)).toEqual([
      references[0].id,
    ]);
    expect(restored?.status).toBe("active");
    expect(restored?.updatedAt).toBe(later);
    expect(sameFocusSessionRevision(restored, progressed)).toBe(true);
    expect(sameFocusSessionRevision(session, progressed)).toBe(false);
  });

  it("completes questions idempotently and closes on the final question", () => {
    const session = createFocusSession(plan, { now: startedAt, sessionId });
    expect(
      completeFocusSessionQuestion(session, references[1].id, later),
    ).toBe(session);
    const first = completeFocusSessionQuestion(
      session,
      references[0].id,
      later,
    );
    const duplicate = completeFocusSessionQuestion(
      first,
      references[0].id,
      finishedAt,
    );
    const second = completeFocusSessionQuestion(
      duplicate,
      references[1].id,
      finishedAt,
    );
    const completed = completeFocusSessionQuestion(
      second,
      references[2].id,
      finishedAt,
    );

    expect(duplicate).toBe(first);
    expect(completed.status).toBe("completed");
    expect(completed.remainingQuestions).toEqual([]);
    expect(completed.completedQuestions.map(({ id }) => id)).toEqual(
      references.map(({ id }) => id),
    );
    expect(completed.completedAt).toBe(finishedAt);
    expect(
      completeFocusSessionQuestion(completed, references[2].id, later),
    ).toBe(completed);
  });

  it("can stop early without losing the unfinished queue", () => {
    const session = createFocusSession(plan, { now: startedAt, sessionId });
    const stopped = completeFocusSession(session, later);

    expect(stopped).toMatchObject({
      status: "completed",
      updatedAt: later,
      completedAt: later,
      remainingQuestions: references,
      completedQuestions: [],
    });
    expect(completeFocusSession(stopped, finishedAt)).toBe(stopped);
  });

  it("drops stale refs from both queues while preserving their order", () => {
    const session = completeFocusSessionQuestion(
      createFocusSession(plan, { now: startedAt, sessionId }),
      references[0].id,
      later,
    );
    const reconciled = reconcileFocusSession(
      session,
      [
        {
          id: references[1].id,
          version: references[1].version,
          sourceHash: references[1].sourceHash,
          deckId: references[1].deckId,
        },
        {
          id: references[2].id,
          version: references[2].version + 1,
          sourceHash: references[2].sourceHash,
          deckId: references[2].deckId,
        },
      ],
      finishedAt,
    );

    expect(reconciled.staleDroppedCount).toBe(2);
    expect(reconciled.session.remainingQuestions).toEqual([references[1]]);
    expect(reconciled.session.completedQuestions).toEqual([]);
    expect(reconciled.session.plan).toEqual(plan);
    expect(reconciled.session.updatedAt).toBe(finishedAt);
  });

  it("drops a ref when its question moves to another deck", () => {
    const session = createFocusSession(plan, { now: startedAt, sessionId });
    const reconciled = reconcileFocusSession(
      session,
      references.map((reference) => ({
        id: reference.id,
        version: reference.version,
        sourceHash: reference.sourceHash,
        deckId:
          reference.id === references[0].id
            ? ("python-interview" as const)
            : reference.deckId,
      })),
      later,
    );

    expect(reconciled.staleDroppedCount).toBe(1);
    expect(reconciled.session.remainingQuestions.map(({ id }) => id)).toEqual([
      references[1].id,
      references[2].id,
    ]);
  });

  it("closes an active session when every queued ref is stale", () => {
    const session = createFocusSession(plan, { now: startedAt, sessionId });
    const reconciled = reconcileFocusSession(session, [], finishedAt);

    expect(reconciled.staleDroppedCount).toBe(references.length);
    expect(reconciled.session).toMatchObject({
      status: "completed",
      updatedAt: finishedAt,
      completedAt: finishedAt,
      remainingQuestions: [],
      completedQuestions: [],
    });
    expect(reconciled.session.plan.questions).toHaveLength(references.length);
  });
});
