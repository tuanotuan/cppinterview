import type { AttemptArtifact } from "@/lib/evidence/contracts";
import {
  buildEvidenceProjection,
  type EvidenceProjection,
} from "@/lib/evidence/engine";
import { attemptArtifactsFromMockHistoryEntry } from "@/lib/mock-interview/evidence-adapter";
import type { MockInterviewHistoryEntry } from "@/lib/mock-interview/trends";

import {
  worldQuantCompetencyKeys,
  type ReadinessQuestionSummary,
} from "./readiness";

export function buildWorldQuantAccountEvidenceProjection({
  coachArtifacts,
  mockHistory,
  questions,
  asOf,
}: {
  coachArtifacts: readonly AttemptArtifact[];
  mockHistory: readonly MockInterviewHistoryEntry[];
  questions: readonly ReadinessQuestionSummary[];
  asOf: string;
}): EvidenceProjection {
  const currentQuestions = questions.map((question) => ({
    id: question.id,
    version: question.version,
    contentRevision: question.sourceHash,
  }));

  return buildEvidenceProjection({
    artifacts: [
      ...coachArtifacts,
      ...mockHistory.flatMap((entry) =>
        attemptArtifactsFromMockHistoryEntry(entry, currentQuestions),
      ),
    ],
    competencies: worldQuantCompetencyKeys.map((key) => ({
      key,
      content: questions.some(
        (question) =>
          question.competency === key &&
          question.validation !== "personal_remediation",
      )
        ? "available"
        : "missing",
      targetSuccessfulAttempts: 2,
    })),
    asOf,
  });
}
