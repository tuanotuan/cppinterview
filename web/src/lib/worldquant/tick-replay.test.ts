import { describe, expect, it } from "vitest";

import {
  gradeTickReplayScenario,
  tickReplayScenarios,
} from "./tick-replay";

describe("tick replay lab", () => {
  it("accepts every canonical deterministic replay plan", () => {
    for (const scenario of tickReplayScenarios) {
      const result = gradeTickReplayScenario(
        scenario.id,
        scenario.canonicalActions,
      );
      expect(result.passed, scenario.id).toBe(true);
      expect(result.checks.every((check) => check.passed)).toBe(true);
    }
  });

  it("does not let a duplicate mutate the canonical book", () => {
    const scenario = tickReplayScenarios.find(
      (item) => item.id === "tick-replay-gap-recovery",
    )!;
    const result = gradeTickReplayScenario(scenario.id, {
      ...scenario.canonicalActions,
      "gap-duplicate-10": "apply",
    });

    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === "sequence-continuity")
        ?.passed,
    ).toBe(false);
  });

  it("blocks publication while a gap is unresolved", () => {
    const scenario = tickReplayScenarios.find(
      (item) => item.id === "tick-replay-gap-recovery",
    )!;
    const result = gradeTickReplayScenario(scenario.id, {
      ...scenario.canonicalActions,
      "gap-block": "publish",
    });

    expect(
      result.checks.find((check) => check.id === "safe-publication")?.passed,
    ).toBe(false);
  });

  it("rejects a snapshot from another feed session", () => {
    const scenario = tickReplayScenarios.find(
      (item) => item.id === "tick-replay-session-and-book-invariants",
    )!;
    const result = gradeTickReplayScenario(scenario.id, {
      ...scenario.canonicalActions,
      "invariant-wrong-snapshot": "accept_snapshot",
    });

    expect(
      result.checks.find((check) => check.id === "snapshot-identity")?.passed,
    ).toBe(false);
  });

  it("produces the same final signature on repeated canonical runs", () => {
    const scenario = tickReplayScenarios[1];
    const first = gradeTickReplayScenario(
      scenario.id,
      scenario.canonicalActions,
    );
    const second = gradeTickReplayScenario(
      scenario.id,
      scenario.canonicalActions,
    );

    expect(first.signature).toBe(second.signature);
  });
});
