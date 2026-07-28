import { describe, expect, it } from "vitest";

import {
  analyzeEnglishVoice,
  analyzeRecordedEnglishVoice,
  buildWorldQuantFullRound,
  isRoundDeadlineExpired,
  remainingRoundSeconds,
  worldQuantFullRoundBlueprintV1,
} from "./full-round";

describe("WorldQuant full round", () => {
  it("builds five stable, distinct non-certification sections", () => {
    const first = buildWorldQuantFullRound("tick-data-platform");
    const second = buildWorldQuantFullRound("tick-data-platform");

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(new Set(first.map((section) => section.id)).size).toBe(5);
    expect(
      first.every((section) => section.drill.variant === "practice"),
    ).toBe(true);
    expect(first.at(-1)).toMatchObject({
      competency: "ownership_communication",
      englishVoice: true,
    });
  });

  it("uses role weights to choose market-data or platform design", () => {
    const tick = buildWorldQuantFullRound("tick-data-platform");
    const platform = buildWorldQuantFullRound("cpp-data-platform");

    expect(tick[2].competency).toBe("tick_market_data");
    expect(platform[2].competency).toBe(
      "distributed_data_platform",
    );
  });

  it("measures words, filler phrases and speaking pace without audio", () => {
    expect(
      analyzeEnglishVoice(
        "Um, I would actually roll back. You know, the mismatch is material.",
        30,
      ),
    ).toEqual({
      wordCount: 12,
      fillerCount: 3,
      wordsPerMinute: 24,
    });
    expect(analyzeEnglishVoice("", 0)).toEqual({
      wordCount: 0,
      fillerCount: 0,
      wordsPerMinute: 0,
    });
  });

  it("derives countdown from an absolute deadline after timer throttling", () => {
    const startedAt = Date.parse("2026-07-28T01:00:00.000Z");
    const deadline = startedAt + 10 * 60 * 1000;

    expect(remainingRoundSeconds(deadline, startedAt)).toBe(600);
    expect(remainingRoundSeconds(deadline, startedAt + 7 * 60 * 1000)).toBe(
      180,
    );
    expect(remainingRoundSeconds(deadline, deadline + 60_000)).toBe(0);
    expect(isRoundDeadlineExpired(deadline, deadline - 1)).toBe(false);
    expect(isRoundDeadlineExpired(deadline, deadline)).toBe(true);
    expect(isRoundDeadlineExpired(null, deadline)).toBe(true);
  });

  it("freezes an exact versioned blueprint identity", () => {
    const rounds = buildWorldQuantFullRound("tick-data-platform");
    const blueprint = worldQuantFullRoundBlueprintV1(
      "tick-data-platform",
    );

    expect(blueprint).toEqual({
      fullRoundVersion: 1,
      roleProfileVersion: 1,
      rounds: rounds.map((round) => ({
        roundId: round.id,
        roundVersion: round.version,
        drillId: round.drill.id,
        drillVersion: round.drill.version,
        rubricTotal: round.drill.rubric.length,
      })),
    });
  });

  it("only reports English voice metrics for recorded speech time", () => {
    expect(
      analyzeRecordedEnglishVoice(
        "I would preserve ordering and expose the rollback threshold.",
        30_000,
      ),
    ).toEqual({
      wordCount: 9,
      fillerCount: 0,
      wordsPerMinute: 18,
    });
    expect(
      analyzeRecordedEnglishVoice(
        "This text was typed manually.",
        0,
      ),
    ).toBeNull();
    expect(analyzeRecordedEnglishVoice("", 30_000)).toBeNull();
    expect(
      analyzeRecordedEnglishVoice("Invalid clock", Number.NaN),
    ).toBeNull();
  });
});
