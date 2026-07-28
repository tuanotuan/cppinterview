import { describe, expect, it } from "vitest";

import { worldQuantConcepts } from "./curriculum";
import {
  assertCompleteDrillCatalog,
  curriculumDrillEvidence,
  drillsForCompetency,
  worldQuantDrillById,
  worldQuantDrillPacks,
  worldQuantDrills,
} from "./drills";
import { worldQuantCompetencyKeys } from "./readiness";

describe("WorldQuant drill catalog", () => {
  it("provides one practice and two fresh checkpoints for every competency", () => {
    expect(assertCompleteDrillCatalog()).toBe(true);
    expect(worldQuantDrillPacks).toHaveLength(
      worldQuantCompetencyKeys.length,
    );
    for (const competency of worldQuantCompetencyKeys) {
      const drills = drillsForCompetency(competency);
      expect(drills.map((drill) => drill.variant).sort()).toEqual([
        "checkpoint",
        "checkpoint",
        "practice",
      ]);
      const drillPack = worldQuantDrillPacks.find(
        (candidate) => candidate.competency === competency,
      )!;
      const checkpoints = drills.filter(
        (drill) => drill.variant === "checkpoint",
      );
      expect(checkpoints).toEqual([
        drillPack.checkpoint,
        drillPack.checkpointRetry,
      ]);
      expect(checkpoints.map((drill) => `${drill.id}@${drill.version}`)).toEqual([
        `${drillPack.id}-checkpoint@1`,
        `${drillPack.id}-checkpoint-retry@1`,
      ]);
      expect(
        new Set([
          drillPack.practice.prompt,
          ...checkpoints.map((drill) => drill.prompt),
        ]).size,
      ).toBe(3);
      expect(
        new Set(
          checkpoints.map((drill) =>
            drill.followUps.map((followUp) => followUp.prompt).join("|"),
          ),
        ).size,
      ).toBe(2);
      expect(
        new Set(
          checkpoints.map((drill) => drill.rubric.join("|")),
        ).size,
      ).toBe(2);
    }
  });

  it("keeps IDs unique and all concept references valid", () => {
    const drillIds = new Set(worldQuantDrills.map((drill) => drill.id));
    const exactDrillIdentities = new Set(
      worldQuantDrills.map((drill) => `${drill.id}@${drill.version}`),
    );
    const prompts = new Set(
      worldQuantDrills.map((drill) => drill.prompt),
    );
    const conceptIds = new Set(
      worldQuantConcepts.map((concept) => concept.id),
    );
    expect(drillIds.size).toBe(worldQuantDrills.length);
    expect(exactDrillIdentities.size).toBe(worldQuantDrills.length);
    expect(prompts.size).toBe(worldQuantDrills.length);
    for (const drill of worldQuantDrills) {
      expect(worldQuantDrillById(drill.id)).toBe(drill);
      expect(drill.followUps).toHaveLength(2);
      expect(drill.rubric.length).toBeGreaterThanOrEqual(4);
      expect(drill.estimatedMinutes).toBeGreaterThanOrEqual(10);
      for (const conceptId of drill.conceptIds) {
        expect(conceptIds.has(conceptId)).toBe(true);
        expect(
          worldQuantConcepts.find(
            (concept) => concept.id === conceptId,
          )?.competency,
        ).toBe(drill.competency);
      }
    }
  });

  it("exposes transfer evidence without copying prompts or rubrics", () => {
    const evidence = curriculumDrillEvidence();
    expect(evidence).toHaveLength(worldQuantDrills.length);
    expect(evidence[0]).toEqual({
      id: worldQuantDrills[0].id,
      conceptIds: worldQuantDrills[0].conceptIds,
      variant: worldQuantDrills[0].variant,
    });
    expect(JSON.stringify(evidence)).not.toContain("rubric");
    expect(JSON.stringify(evidence)).not.toContain("prompt");
  });

  it("includes an English ownership checkpoint", () => {
    const checkpoints = drillsForCompetency(
      "ownership_communication",
    ).filter((drill) => drill.variant === "checkpoint");
    expect(checkpoints).toHaveLength(2);
    for (const checkpoint of checkpoints) {
      expect(checkpoint.language).toBe("english");
      expect(checkpoint.prompt).toContain("Answer in English");
    }
  });
});
