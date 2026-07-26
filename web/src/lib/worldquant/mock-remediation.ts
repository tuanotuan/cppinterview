import type { QuestionLearningState } from "../practice/learning-state";

import {
  buildWorldQuantFocusPlan,
  type WorldQuantFocusPlan,
} from "./focus-plan";
import {
  worldQuantMockDebriefSchema,
  type WorldQuantMockDebrief,
  type WorldQuantMockRankedGap,
} from "./mock-debrief";
import type { ReadinessQuestionSummary } from "./readiness";

export const WORLDQUANT_MOCK_REMEDIATION_VERSION = 1 as const;

export type WorldQuantMockRemediationAvailability =
  | "focus_sprint"
  | "guide"
  | "content_gap"
  | "unavailable";

export type WorldQuantMockRemediationOption = {
  rank: number;
  competency: WorldQuantMockRankedGap["competency"];
  weightedDeficit: number;
  availability: WorldQuantMockRemediationAvailability;
  plan: WorldQuantFocusPlan;
};

export type WorldQuantMockRemediation = {
  version: typeof WORLDQUANT_MOCK_REMEDIATION_VERSION;
  debriefVersion: WorldQuantMockDebrief["version"];
  profileId: WorldQuantMockDebrief["profileId"];
  recommendations: WorldQuantMockRemediationOption[];
  bestEligible: WorldQuantMockRemediationOption | null;
};

export function buildWorldQuantMockRemediation({
  debrief,
  approvedQuestions,
  states,
  today,
  timeBudgetMinutes,
}: {
  debrief: WorldQuantMockDebrief;
  approvedQuestions: readonly ReadinessQuestionSummary[];
  states: ReadonlyMap<string, QuestionLearningState>;
  today: string;
  timeBudgetMinutes: number;
}): WorldQuantMockRemediation {
  const parsedDebrief = worldQuantMockDebriefSchema.parse(debrief);
  const recommendations = parsedDebrief.rankedGaps.map(
    (gap): WorldQuantMockRemediationOption => {
      const plan = buildWorldQuantFocusPlan({
        profileId: parsedDebrief.profileId,
        questions: approvedQuestions,
        states,
        today,
        timeBudgetMinutes,
        focusCompetency: gap.competency,
      });
      return {
        rank: gap.rank,
        competency: gap.competency,
        weightedDeficit: gap.weightedDeficit,
        availability: remediationAvailability(plan),
        plan,
      };
    },
  );

  return {
    version: WORLDQUANT_MOCK_REMEDIATION_VERSION,
    debriefVersion: parsedDebrief.version,
    profileId: parsedDebrief.profileId,
    recommendations,
    bestEligible:
      recommendations.find(
        (recommendation) =>
          recommendation.availability !== "unavailable",
      ) ?? null,
  };
}

function remediationAvailability(
  plan: WorldQuantFocusPlan,
): WorldQuantMockRemediationAvailability {
  if (plan.questions.length > 0) return "focus_sprint";
  if (plan.fallbacks.some((fallback) => fallback.kind === "guide")) {
    return "guide";
  }
  if (
    plan.fallbacks.some((fallback) => fallback.kind === "content_gap")
  ) {
    return "content_gap";
  }
  return "unavailable";
}
