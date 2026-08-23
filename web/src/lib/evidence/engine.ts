import { z } from "zod";

import {
  attemptArtifactSchema,
  type AttemptArtifact,
  type CompetencyAssessment,
} from "./contracts";

export const EVIDENCE_PROJECTION_VERSION = 1 as const;

const competencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9][a-z0-9_:+.-]*$/);

export const evidenceCompetencyDefinitionSchema = z
  .object({
    key: competencyKeySchema,
    content: z.enum(["available", "missing"]),
    targetSuccessfulAttempts: z.number().int().min(1).max(10).default(2),
  })
  .strict();

export const evidencePolicySchema = z
  .object({
    passingScore: z.number().int().min(1).max(100).default(70),
    minimumConfidence: z.number().min(0).max(1).default(0.6),
    staleAfterDays: z.number().int().min(1).max(730).default(45),
  })
  .strict();

export const DEFAULT_EVIDENCE_POLICY = evidencePolicySchema.parse({});

export const competencyEvidenceProjectionSchema = z
  .object({
    key: competencyKeySchema,
    status: z.enum(["unassessed", "learning", "verified", "stale"]),
    content: z.enum(["available", "missing"]),
    gapKind: z.enum(["none", "content", "learner", "mixed"]),
    nextAction: z.enum([
      "add_content",
      "assess",
      "practice",
      "repair",
      "refresh",
      "maintain",
    ]),
    score: z.number().int().min(0).max(100).nullable(),
    assessmentCount: z.number().int().nonnegative(),
    successfulAttemptCount: z.number().int().nonnegative(),
    latestEvidenceAt: z.string().datetime({ offset: true }).nullable(),
    supportingArtifactIds: z.array(z.string().min(1).max(360)),
    contradictingArtifactIds: z.array(z.string().min(1).max(360)),
    recommendedQuestionIds: z.array(competencyKeySchema).max(10),
  })
  .strict();

export const evidenceProjectionSchema = z
  .object({
    version: z.literal(EVIDENCE_PROJECTION_VERSION),
    asOf: z.string().datetime({ offset: true }),
    competencies: z.array(competencyEvidenceProjectionSchema),
  })
  .strict();

export type EvidenceCompetencyDefinition = z.infer<
  typeof evidenceCompetencyDefinitionSchema
>;
export type EvidencePolicy = z.infer<typeof evidencePolicySchema>;
export type CompetencyEvidenceProjection = z.infer<
  typeof competencyEvidenceProjectionSchema
>;
export type EvidenceProjection = z.infer<typeof evidenceProjectionSchema>;

type AssessmentObservation = {
  artifact: AttemptArtifact;
  assessment: CompetencyAssessment;
};

export function buildEvidenceProjection({
  artifacts,
  competencies,
  asOf,
  policy = DEFAULT_EVIDENCE_POLICY,
}: {
  artifacts: readonly AttemptArtifact[];
  competencies: readonly EvidenceCompetencyDefinition[];
  asOf: string;
  policy?: EvidencePolicy;
}): EvidenceProjection {
  const asOfMs = Date.parse(asOf);
  if (!Number.isFinite(asOfMs)) throw new Error("Evidence asOf must be valid");
  const parsedArtifacts = artifacts
    .map((artifact) => attemptArtifactSchema.parse(artifact))
    .filter((artifact) => Date.parse(artifact.occurredAt) <= asOfMs);
  const artifactIds = parsedArtifacts.map((artifact) => artifact.id);
  if (new Set(artifactIds).size !== artifactIds.length) {
    throw new Error("Attempt artifact IDs must be unique in one projection");
  }
  const parsedDefinitions = competencies.map((definition) =>
    evidenceCompetencyDefinitionSchema.parse(definition),
  );
  const definitionKeys = parsedDefinitions.map((definition) => definition.key);
  if (new Set(definitionKeys).size !== definitionKeys.length) {
    throw new Error("Evidence competency definitions must be unique");
  }
  const parsedPolicy = evidencePolicySchema.parse(policy);
  const projections = parsedDefinitions.map((definition) => {
    const observations = observationsFor(
      parsedArtifacts,
      definition.key,
    );
    const successful = observations.filter((observation) =>
      isSuccessful(observation, parsedPolicy),
    );
    const latestSuccessful = latestObservation(successful);
    const latest = latestObservation(observations);
    const latestContradicts =
      latest !== null && isContradiction(latest, parsedPolicy);
    const verified =
      successful.length >= definition.targetSuccessfulAttempts &&
      !latestContradicts;
    const stale =
      verified &&
      latestSuccessful !== null &&
      asOfMs - Date.parse(latestSuccessful.artifact.occurredAt) >
        parsedPolicy.staleAfterDays * 86_400_000;
    const status: CompetencyEvidenceProjection["status"] =
      observations.length === 0
        ? "unassessed"
        : stale
          ? "stale"
          : verified
            ? "verified"
            : "learning";
    const score = weightedScore(observations);
    const supportingArtifactIds = uniqueSorted(
      successful.map((observation) => observation.artifact.id),
    );
    const contradictingArtifactIds = uniqueSorted(
      observations
        .filter((observation) => isContradiction(observation, parsedPolicy))
        .map((observation) => observation.artifact.id),
    );
    const recommendedQuestionIds = recommendedQuestions({
      latest,
      latestSuccessful,
      status,
      latestContradicts,
    });
    return competencyEvidenceProjectionSchema.parse({
      key: definition.key,
      status,
      content: definition.content,
      gapKind: gapKind(definition.content, status),
      nextAction: nextAction(definition.content, status, latestContradicts),
      score,
      assessmentCount: observations.length,
      successfulAttemptCount: successful.length,
      latestEvidenceAt: latest?.artifact.occurredAt ?? null,
      supportingArtifactIds,
      contradictingArtifactIds,
      recommendedQuestionIds,
    });
  });

  return evidenceProjectionSchema.parse({
    version: EVIDENCE_PROJECTION_VERSION,
    asOf,
    competencies: projections,
  });
}

function observationsFor(
  artifacts: readonly AttemptArtifact[],
  competency: string,
): AssessmentObservation[] {
  return artifacts
    .flatMap((artifact) => {
      const assessment = artifact.assessments.find(
        (candidate) => candidate.key === competency,
      );
      return assessment?.status === "assessed"
        ? [{ artifact, assessment }]
        : [];
    })
    .sort(
      (left, right) =>
        left.artifact.occurredAt.localeCompare(right.artifact.occurredAt) ||
        left.artifact.id.localeCompare(right.artifact.id),
    );
}

function isSuccessful(
  observation: AssessmentObservation,
  policy: EvidencePolicy,
) {
  const { artifact, assessment } = observation;
  const executionInvalid = [
    artifact.verification.compile,
    artifact.verification.tests,
    artifact.verification.sanitizers,
  ].some(
    (status) => status === "failed" || status === "infrastructure_error",
  );
  return (
    artifact.question.current &&
    assessment.score !== null &&
    assessment.score >= policy.passingScore &&
    assessment.confidence >= policy.minimumConfidence &&
    artifact.response.status !== "not_provided" &&
    !artifact.response.usedHint &&
    !artifact.response.revealedReference &&
    !executionInvalid
  );
}

function isContradiction(
  observation: AssessmentObservation,
  policy: EvidencePolicy,
) {
  const { artifact, assessment } = observation;
  const executionInvalid = [
    artifact.verification.compile,
    artifact.verification.tests,
    artifact.verification.sanitizers,
  ].some(
    (status) => status === "failed" || status === "infrastructure_error",
  );
  return (
    !artifact.question.current ||
    assessment.score === null ||
    assessment.score < policy.passingScore ||
    artifact.response.status === "not_provided" ||
    artifact.response.usedHint ||
    artifact.response.revealedReference ||
    executionInvalid
  );
}

function weightedScore(observations: readonly AssessmentObservation[]) {
  if (observations.length === 0) return null;
  const totalWeight = observations.reduce(
    (sum, observation) => sum + observation.assessment.confidence,
    0,
  );
  if (totalWeight === 0) return null;
  return Math.round(
    observations.reduce(
      (sum, observation) =>
        sum + observation.assessment.score! * observation.assessment.confidence,
      0,
    ) / totalWeight,
  );
}

function latestObservation(observations: readonly AssessmentObservation[]) {
  return observations.at(-1) ?? null;
}

function gapKind(
  content: EvidenceCompetencyDefinition["content"],
  status: CompetencyEvidenceProjection["status"],
): CompetencyEvidenceProjection["gapKind"] {
  const contentGap = content === "missing";
  const learnerGap = status === "learning" || status === "stale";
  if (contentGap && learnerGap) return "mixed";
  if (contentGap) return "content";
  if (learnerGap) return "learner";
  return "none";
}

function nextAction(
  content: EvidenceCompetencyDefinition["content"],
  status: CompetencyEvidenceProjection["status"],
  latestContradicts: boolean,
): CompetencyEvidenceProjection["nextAction"] {
  if (content === "missing" && status === "unassessed") return "add_content";
  if (status === "unassessed") return "assess";
  if (status === "learning") return latestContradicts ? "repair" : "practice";
  if (status === "stale") return "refresh";
  return "maintain";
}

function recommendedQuestions({
  latest,
  latestSuccessful,
  status,
  latestContradicts,
}: {
  latest: AssessmentObservation | null;
  latestSuccessful: AssessmentObservation | null;
  status: CompetencyEvidenceProjection["status"];
  latestContradicts: boolean;
}) {
  if (status === "stale" && latestSuccessful) {
    return [latestSuccessful.artifact.question.id];
  }
  if (status === "learning" && latestContradicts && latest) {
    return [latest.artifact.question.id];
  }
  return [];
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
