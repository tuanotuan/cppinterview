import { describe, expect, it } from "vitest";

import {
  EMPTY_PRACTICE_SIGNAL_STORE,
  buildCalibrationSummary,
  mergePracticeSignalStores,
  outcomeForReview,
  parsePracticeSignalStore,
  recordPracticeAttemptSignal,
  serializePracticeSignalStore,
  writePracticeSignalStore,
  type PracticeAttemptSignal,
} from "./signals";

function event(
  id: string,
  confidencePercent: number | null,
  outcome: PracticeAttemptSignal["outcome"],
): PracticeAttemptSignal {
  return {
    eventId: id,
    questionId: "cpp-lifetime",
    questionVersion: 1,
    sourceHash: "a".repeat(64),
    occurredAt: "2026-07-28T00:00:00.000Z",
    mode: "scheduled",
    rating: outcome === "correct" ? "good" : "again",
    confidencePercent,
    responseTimeMs: 20_000,
    hintUsed: false,
    answerRevealed: true,
    coachFeedbackUsed: false,
    coachScore: null,
    outcome,
  };
}

describe("practice confidence signals", () => {
  it("prefers grounded coach score and falls back to rating", () => {
    expect(outcomeForReview({ rating: "easy", coachScore: 20 })).toBe(
      "incorrect",
    );
    expect(outcomeForReview({ rating: "hard" })).toBe("partial");
    expect(outcomeForReview({ rating: "good" })).toBe("correct");
  });

  it("finds high-confidence mistakes and calibration error", () => {
    const events = [
      event(
        "40000000-0000-4000-8000-000000000001",
        90,
        "incorrect",
      ),
      event(
        "40000000-0000-4000-8000-000000000002",
        80,
        "correct",
      ),
      event(
        "40000000-0000-4000-8000-000000000003",
        null,
        "correct",
      ),
    ];
    const summary = buildCalibrationSummary(events);
    expect(summary.eventCount).toBe(3);
    expect(summary.calibratedEventCount).toBe(2);
    expect(summary.highConfidenceMistakes).toBe(1);
    expect(summary.expectedCalibrationError).not.toBeNull();
  });

  it("stores no candidate answer and deduplicates event IDs", () => {
    const signal = event(
      "40000000-0000-4000-8000-000000000001",
      60,
      "partial",
    );
    const once = recordPracticeAttemptSignal(
      EMPTY_PRACTICE_SIGNAL_STORE,
      signal,
    );
    const twice = recordPracticeAttemptSignal(once, signal);
    expect(twice.events).toHaveLength(1);
    expect(JSON.stringify(twice)).not.toContain("candidateAnswer");
    expect(
      parsePracticeSignalStore(serializePracticeSignalStore(twice)),
    ).toEqual(twice);
  });

  it("upgrades legacy signals without coach exposure evidence", () => {
    const legacy = event(
      "40000000-0000-4000-8000-000000000099",
      60,
      "partial",
    );
    const legacyEvent = {
      ...legacy,
      coachFeedbackUsed: undefined,
    };
    const parsed = parsePracticeSignalStore(
      JSON.stringify({ version: 1, events: [legacyEvent] }),
    );
    expect(parsed.events[0].coachFeedbackUsed).toBe(false);
  });

  it("merges a stale writer with persisted events by immutable eventId", () => {
    const persisted = recordPracticeAttemptSignal(
      EMPTY_PRACTICE_SIGNAL_STORE,
      event(
        "40000000-0000-4000-8000-000000000001",
        70,
        "correct",
      ),
    );
    const staleIncoming = recordPracticeAttemptSignal(
      EMPTY_PRACTICE_SIGNAL_STORE,
      event(
        "40000000-0000-4000-8000-000000000002",
        90,
        "incorrect",
      ),
    );
    const merged = mergePracticeSignalStores(
      persisted,
      staleIncoming,
    );
    expect(merged.events.map((item) => item.eventId)).toEqual([
      "40000000-0000-4000-8000-000000000001",
      "40000000-0000-4000-8000-000000000002",
    ]);

    const conflicting = recordPracticeAttemptSignal(
      staleIncoming,
      event(
        "40000000-0000-4000-8000-000000000001",
        5,
        "incorrect",
      ),
    );
    expect(
      mergePracticeSignalStores(persisted, conflicting).events.find(
        (item) =>
          item.eventId ===
          "40000000-0000-4000-8000-000000000001",
      ),
    ).toEqual(persisted.events[0]);
  });

  it("rereads local storage immediately before writing a stale snapshot", () => {
    const persisted = recordPracticeAttemptSignal(
      EMPTY_PRACTICE_SIGNAL_STORE,
      event(
        "40000000-0000-4000-8000-000000000001",
        70,
        "correct",
      ),
    );
    const staleIncoming = recordPracticeAttemptSignal(
      EMPTY_PRACTICE_SIGNAL_STORE,
      event(
        "40000000-0000-4000-8000-000000000002",
        90,
        "incorrect",
      ),
    );
    let raw = serializePracticeSignalStore(persisted);
    const notices: Array<string | null> = [];
    const merged = writePracticeSignalStore(
      null,
      staleIncoming,
      {
        read: () => raw,
        write: (_key, value) => {
          raw = value;
        },
        notify: (accountId) => notices.push(accountId),
      },
    );

    expect(parsePracticeSignalStore(raw)).toEqual(merged);
    expect(merged.events).toHaveLength(2);
    expect(notices).toEqual([null]);
  });
});
