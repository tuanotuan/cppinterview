import {
  ATTEMPT_ARTIFACT_VERSION,
  attemptArtifactSchema,
  type AttemptArtifact,
} from "@/lib/evidence/contracts";

type MockEvidenceHistoryEntry = {
  attemptId: string;
  completedAt: string | null;
  report: unknown;
};

export function attemptArtifactsFromMockHistoryEntry(
  entry: MockEvidenceHistoryEntry,
): AttemptArtifact[] {
  if (!entry.completedAt || !isRecord(entry.report)) return [];
  const plan = readRecord(entry.report.plan);
  const scopedReport = readRecord(entry.report.report);
  const questions = plan && Array.isArray(plan.questions) ? plan.questions : [];
  const assessments =
    scopedReport && Array.isArray(scopedReport.questionAssessments)
      ? scopedReport.questionAssessments
      : [];
  const executionResults = Array.isArray(entry.report.executionResults)
    ? entry.report.executionResults
    : [];
  const scoreByQuestionId = new Map<string, number>();
  const ambiguousQuestionIds = new Set<string>();
  for (const value of assessments) {
    const assessment = readRecord(value);
    if (
      assessment &&
      typeof assessment.questionId === "string" &&
      Number.isInteger(assessment.score) &&
      (assessment.score as number) >= 0 &&
      (assessment.score as number) <= 100
    ) {
      if (scoreByQuestionId.has(assessment.questionId)) {
        ambiguousQuestionIds.add(assessment.questionId);
      } else {
        scoreByQuestionId.set(
          assessment.questionId,
          assessment.score as number,
        );
      }
    }
  }
  for (const questionId of ambiguousQuestionIds) {
    scoreByQuestionId.delete(questionId);
  }

  const artifacts = questions.flatMap((value, index) => {
    const candidate = readRecord(value);
    const question = candidate ? readRecord(candidate.question) : null;
    if (
      !candidate ||
      !question ||
      typeof candidate.readinessCompetency !== "string" ||
      typeof question.id !== "string" ||
      !Number.isInteger(question.version) ||
      (question.version as number) <= 0 ||
      typeof question.contentRevision !== "string" ||
      (question.responseMode !== "text" && question.responseMode !== "code")
    ) {
      return [];
    }
    const score = scoreByQuestionId.get(question.id);
    if (score === undefined) return [];
    const evidenceId = `mock:score:${index + 1}`;
    const verification = executionVerification(
      executionResults,
      question.id,
    );
    const parsed = attemptArtifactSchema.safeParse({
      version: ATTEMPT_ARTIFACT_VERSION,
      id: `mock:${entry.attemptId}:${question.id}`,
      source: { kind: "mock", attemptId: entry.attemptId },
      occurredAt: entry.completedAt,
      question: {
        id: question.id,
        version: question.version,
        contentRevision: question.contentRevision,
        responseMode: question.responseMode,
      },
      response: {
        // Completed reports intentionally do not persist raw candidate answers.
        status: "not_captured",
        usedHint: false,
        revealedReference: false,
      },
      verification,
      evidence: [
        {
          id: evidenceId,
          kind: "rubric",
          label: "Mock interview question score",
          visibility: "learner",
        },
      ],
      assessments: [
        {
          key: candidate.readinessCompetency,
          status: "assessed",
          score,
          confidence: 0.9,
          evidenceIds: [evidenceId],
          criteria: [],
        },
      ],
      outcome: {
        score,
        verdict: verdictForScore(score),
        suggestedRating: null,
      },
    });
    return parsed.success ? [parsed.data] : [];
  });
  if (
    artifacts.length !== questions.length ||
    new Set(artifacts.map((artifact) => artifact.id)).size !== artifacts.length
  ) {
    return [];
  }
  return artifacts;
}

function executionVerification(values: unknown[], questionId: string) {
  const execution = values.find((value) => {
    const record = readRecord(value);
    return record?.questionId === questionId;
  });
  const result = readRecord(readRecord(execution)?.result);
  const status = result?.status;
  if (status === undefined) {
    return { compile: "not_run", tests: "not_run", sanitizers: "not_run" };
  }
  if (status === "passed") {
    return { compile: "passed", tests: "passed", sanitizers: "not_run" };
  }
  if (status === "sandbox_error") {
    return {
      compile: "infrastructure_error",
      tests: "infrastructure_error",
      sanitizers: "not_run",
    };
  }
  if (status === "compile_error") {
    return { compile: "failed", tests: "not_run", sanitizers: "not_run" };
  }
  return { compile: "passed", tests: "failed", sanitizers: "not_run" };
}

function verdictForScore(score: number) {
  return score >= 85
    ? "strong"
    : score >= 65
      ? "solid"
      : score >= 40
        ? "partial"
        : "needs_work";
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
