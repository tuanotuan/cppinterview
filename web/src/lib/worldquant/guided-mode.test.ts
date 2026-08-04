import { describe, expect, it } from "vitest";

import {
  completeWorldQuantGuidedOnboarding,
  isWorldQuantMissionComplete,
  nextWorldQuantMissionStep,
  normalizeWorldQuantMissionMinutes,
  parseWorldQuantGuidedModeState,
  parseWorldQuantMissionReturn,
  serializeWorldQuantGuidedModeState,
  withWorldQuantMissionReturn,
  worldQuantGuidedMissionHref,
  worldQuantGuidedModeStorageKey,
} from "./guided-mode";

describe("WorldQuant guided mode", () => {
  it("scopes onboarding state by account or local mode", () => {
    const accountId = "10000000-0000-4000-8000-000000000010";
    expect(worldQuantGuidedModeStorageKey(null)).toBe(
      "recall:worldquant-guided:v1:local",
    );
    expect(worldQuantGuidedModeStorageKey(accountId)).toBe(
      `recall:worldquant-guided:v1:${accountId}`,
    );
    expect(() => worldQuantGuidedModeStorageKey("local")).toThrow();
  });

  it("fails malformed or future onboarding state back to first visit", () => {
    expect(parseWorldQuantGuidedModeState(null).onboardingCompletedAt).toBeNull();
    expect(
      parseWorldQuantGuidedModeState("{broken").onboardingCompletedAt,
    ).toBeNull();
    expect(
      parseWorldQuantGuidedModeState(
        JSON.stringify({
          version: 2,
          onboardingCompletedAt: "2026-07-28T00:00:00.000Z",
        }),
      ).onboardingCompletedAt,
    ).toBeNull();
  });

  it("round-trips a completed onboarding state", () => {
    const completed = completeWorldQuantGuidedOnboarding(
      "2026-07-28T00:00:00.000Z",
    );
    expect(
      parseWorldQuantGuidedModeState(
        serializeWorldQuantGuidedModeState(completed),
      ),
    ).toEqual(completed);
  });

  it("builds an exact, normalized mission URL", () => {
    expect(normalizeWorldQuantMissionMinutes(52)).toBe(45);
    expect(normalizeWorldQuantMissionMinutes(500)).toBe(120);
    expect(
      worldQuantGuidedMissionHref("tick-data-platform", 52),
    ).toBe(
      "/worldquant/mission?role=tick-data-platform&minutes=45",
    );
  });

  it("adds and validates a structured internal mission return", () => {
    const href = withWorldQuantMissionReturn(
      "/practice?deck=cpp-interview&focus=focus-id",
      "tick-data-platform",
      30,
    );
    const url = new URL(href, "https://recall.local");
    expect(url.searchParams.get("focus")).toBe("focus-id");
    expect(url.searchParams.get("returnTo")).toBe(
      "worldquant-mission",
    );
    expect(
      parseWorldQuantMissionReturn({
        returnTo: url.searchParams.get("returnTo") ?? undefined,
        role: url.searchParams.get("returnRole") ?? undefined,
        minutes: url.searchParams.get("returnMinutes") ?? undefined,
      }),
    ).toBe(
      "/worldquant/mission?role=tick-data-platform&minutes=30",
    );
    expect(() =>
      withWorldQuantMissionReturn(
        "https://example.com/steal",
        "tick-data-platform",
        30,
      ),
    ).toThrow();
    expect(
      parseWorldQuantMissionReturn({
        returnTo: "worldquant-mission",
        role: "not-a-role",
        minutes: "30",
      }),
    ).toBeNull();
    for (const minutes of [undefined, "", "NaN", "Infinity", "31", "135"]) {
      expect(
        parseWorldQuantMissionReturn({
          returnTo: "worldquant-mission",
          role: "tick-data-platform",
          minutes,
        }),
      ).toBeNull();
    }
  });

  it("selects the first incomplete actionable mission item", () => {
    const items = [
      { id: "gap", kind: "content_gap" },
      { id: "repair", kind: "repair" },
      { id: "cards", kind: "flashcards" },
      { id: "drill", kind: "drill" },
    ];
    expect(nextWorldQuantMissionStep(items, new Set())).toMatchObject({
      item: { id: "repair" },
      position: 1,
      total: 3,
    });
    expect(
      nextWorldQuantMissionStep(items, new Set(["repair", "cards"])),
    ).toMatchObject({
      item: { id: "drill" },
      position: 3,
      total: 3,
    });
    expect(
      nextWorldQuantMissionStep(
        items,
        new Set(["repair", "cards", "drill"]),
      ),
    ).toBeNull();
  });

  it("only marks a non-empty, gap-free actionable Mission complete", () => {
    const completed = new Set(["cards", "drill"]);
    expect(
      isWorldQuantMissionComplete(
        [
          { id: "cards", kind: "flashcards" },
          { id: "drill", kind: "drill" },
        ],
        completed,
      ),
    ).toBe(true);
    expect(isWorldQuantMissionComplete([], completed)).toBe(false);
    expect(
      isWorldQuantMissionComplete(
        [{ id: "gap", kind: "content_gap" }],
        completed,
      ),
    ).toBe(false);
    expect(
      isWorldQuantMissionComplete(
        [
          { id: "cards", kind: "flashcards" },
          { id: "gap", kind: "content_gap" },
        ],
        completed,
      ),
    ).toBe(false);
  });
});
