import type { ContentManifest } from "@/lib/content/schema";
import {
  isQuestionApproved,
  type QuestionApproval,
} from "@/lib/practice/approvals";

import {
  buildWorldQuantCurriculumCoverage,
  type CurriculumQuestionEvidence,
} from "./curriculum";
import { curriculumDrillEvidence } from "./drills";
import { classifyWorldQuantCompetency } from "./readiness";

export function buildCurriculumEvidenceFromManifest({
  manifest,
  approvals,
  mistakeQuestionIds = [],
}: {
  manifest: ContentManifest;
  approvals: readonly QuestionApproval[];
  mistakeQuestionIds?: readonly string[];
}) {
  const mistakeIds = new Set(mistakeQuestionIds);
  const questions: CurriculumQuestionEvidence[] =
    manifest.questions.flatMap((question) => {
      if (question.status === "archived") return [];
      const approved = isQuestionApproved(
        question,
        approvals as QuestionApproval[],
      );
      const evidence: CurriculumQuestionEvidence = {
        id: question.id,
        competency: classifyWorldQuantCompetency({
          deckId: question.taxonomy.deckId,
          language: question.taxonomy.language,
          lessonId: question.lessonId,
          topics: question.taxonomy.topics,
          tags: question.taxonomy.tags,
        }),
        lessonId: question.lessonId,
        topics: question.taxonomy.topics,
        tags: question.taxonomy.tags,
        evidenceKind:
          question.status === "verified"
            ? "repository_verified"
            : approved
              ? "owner_approved"
              : "pending_review",
      };
      return [
        mistakeIds.has(question.id)
          ? {
              ...evidence,
              evidenceKind: "personal_remediation" as const,
            }
          : evidence,
      ];
    });
  return buildWorldQuantCurriculumCoverage({
    questions,
    drills: curriculumDrillEvidence(),
  });
}
