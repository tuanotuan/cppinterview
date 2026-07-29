import { describe, expect, it } from "vitest";

import manifestJson from "@/generated/content-manifest.json";
import { contentManifestSchema } from "@/lib/content/schema";

import {
  buildWorldQuantBankCatalog,
  curatedReadinessCompetency,
  legacyMockCompetencyForReadiness,
  resolveTargetedMockPlan,
  targetedMockCandidates,
  WORLDQUANT_CURATED_CATALOG,
} from "./catalog";
import { buildWorldQuantTargetedMockPlan } from "./target-plan";

describe("WorldQuant mock catalog", () => {
  it("maps every curated role question to one canonical competency", () => {
    expect(WORLDQUANT_CURATED_CATALOG).toHaveLength(14);
    expect(
      WORLDQUANT_CURATED_CATALOG.every(
        (question) =>
          curatedReadinessCompetency(question.id) ===
          question.readinessCompetency,
      ),
    ).toBe(true);
  });

  it("uses the approved readiness classifier for bank questions", () => {
    const manifest = contentManifestSchema.parse(manifestJson);
    const source = manifest.questions[0]!;
    const tickSource = {
      ...source,
      id: "test-tick-source",
      status: "verified" as const,
      taxonomy: {
        ...source.taxonomy,
        topics: ["tick-data"],
        tags: ["tick-data"],
      },
    };
    const questions = buildWorldQuantBankCatalog({
      manifest: { ...manifest, questions: [tickSource] },
      approvals: [],
    });

    const tickQuestion = questions.find(
      (question) => question.id === tickSource.id,
    );
    expect(tickQuestion).toMatchObject({
      origin: "question_bank",
      readinessCompetency: "tick_market_data",
    });
  });

  it("keeps the legacy report bucket as a presentation adapter only", () => {
    expect(legacyMockCompetencyForReadiness("concurrency_memory")).toBe(
      "data_pipeline_performance",
    );
    expect(legacyMockCompetencyForReadiness("tick_market_data")).toBe(
      "tick_data_order_book",
    );
  });

  it("resolves only exact approved catalog identities", () => {
    const plan = buildWorldQuantTargetedMockPlan({
      profileId: "tick-data-platform",
      mode: "balanced",
      durationMinutes: 30,
      candidates: targetedMockCandidates(WORLDQUANT_CURATED_CATALOG),
    });
    expect(
      resolveTargetedMockPlan({
        plan,
        catalog: WORLDQUANT_CURATED_CATALOG,
      }),
    ).toHaveLength(plan.questions.length);
    expect(
      resolveTargetedMockPlan({
        plan: {
          ...plan,
          questions: plan.questions.map((candidate, index) =>
            index === 0
              ? {
                  ...candidate,
                  question: {
                    ...candidate.question,
                    contentRevision: "tampered",
                  },
                }
              : candidate,
          ),
        },
        catalog: WORLDQUANT_CURATED_CATALOG,
      }),
    ).toBeNull();
  });
});
