import { describe, expect, it } from "vitest";
import { gradeLegacyModernCapstone, legacyModernCapstonePhases } from "./legacy-modern-capstone";

describe("legacy to modern capstone", () => {
  const selections = (id: string) => Object.fromEntries(legacyModernCapstonePhases.find((item) => item.id === id)!.checks.map((item) => [item.id, item.expectedOptionId]));
  it("passes every canonical phase", () => {
    for (const phase of legacyModernCapstonePhases) expect(gradeLegacyModernCapstone(phase.id, selections(phase.id)).passed).toBe(true);
  });
  it("never accepts tolerance for count or sequence", () => {
    expect(gradeLegacyModernCapstone("capstone-golden", { sequence: "tolerance", floating: "policy" }).passed).toBe(false);
    expect(gradeLegacyModernCapstone("capstone-reconcile", { blocks: "all-tolerance", evidence: "identity" }).passed).toBe(false);
  });
  it("requires provenance and a tested rollback", () => {
    expect(gradeLegacyModernCapstone("capstone-baseline", { provenance: "code", ownership: "owner" }).passed).toBe(false);
    expect(gradeLegacyModernCapstone("capstone-rollout", { canary: "small", rollback: "idea" }).passed).toBe(false);
  });
});
