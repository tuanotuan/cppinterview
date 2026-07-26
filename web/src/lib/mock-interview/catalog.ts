import type { ContentManifest } from "@/lib/content/schema";
import { displayQuestionPrompt } from "@/lib/content/question-prompt";
import type { QuestionApproval } from "@/lib/practice/approvals";
import { isQuestionApproved } from "@/lib/practice/approvals";
import {
  classifyWorldQuantCompetency,
  type WorldQuantCompetencyKey,
} from "@/lib/worldquant/readiness";

import {
  inferMockCompetency,
  WORLDQUANT_ROLE_QUESTIONS,
  type MockCompetencyKey,
  type MockInterviewQuestion,
} from "./profile";
import type {
  TargetedMockCandidate,
  TargetedMockPlan,
} from "./target-plan";

export type WorldQuantMockQuestion = MockInterviewQuestion & {
  readinessCompetency: WorldQuantCompetencyKey;
};

const curatedReadinessCompetencies = {
  "worldquant-tick-feed-correctness": "tick_market_data",
  "worldquant-interval-stats-cpp": "performance_latency",
  "worldquant-legacy-migration": "ownership_communication",
  "worldquant-cmake-delivery": "build_delivery",
  "worldquant-python-reconciliation": "scripting_automation",
  "worldquant-researcher-collaboration": "ownership_communication",
  "worldquant-order-book-update-cpp": "tick_market_data",
  "worldquant-cpp-event-lifetime": "modern_cpp",
  "worldquant-partitioned-pipeline-backpressure":
    "distributed_data_platform",
  "worldquant-feed-regression-testing": "build_delivery",
  "worldquant-python-gap-audit": "scripting_automation",
  "worldquant-cpp-feed-api-evolution": "modern_cpp",
  "worldquant-production-data-incident": "ownership_communication",
  "worldquant-parallel-replay-determinism": "performance_latency",
} as const satisfies Record<string, WorldQuantCompetencyKey>;

export function curatedReadinessCompetency(
  questionId: string,
): WorldQuantCompetencyKey | null {
  return (
    curatedReadinessCompetencies[
      questionId as keyof typeof curatedReadinessCompetencies
    ] ?? null
  );
}

export const WORLDQUANT_CURATED_CATALOG: readonly WorldQuantMockQuestion[] =
  WORLDQUANT_ROLE_QUESTIONS.map((question) => {
    const readinessCompetency = curatedReadinessCompetency(question.id);
    if (!readinessCompetency) {
      throw new Error(
        `Curated mock question is missing readiness competency: ${question.id}`,
      );
    }
    return { ...question, readinessCompetency };
  });

export function buildWorldQuantBankCatalog({
  manifest,
  approvals,
}: {
  manifest: ContentManifest;
  approvals: readonly QuestionApproval[];
}): WorldQuantMockQuestion[] {
  const lessonById = new Map(
    manifest.lessons.map((lesson) => [lesson.id, lesson]),
  );

  return manifest.questions.flatMap((question): WorldQuantMockQuestion[] => {
    if (
      question.status === "archived" ||
      (question.status !== "verified" &&
        !isQuestionApproved(question, [...approvals]))
    ) {
      return [];
    }
    const lesson = lessonById.get(question.lessonId);
    if (!lesson) return [];
    return [
      {
        id: question.id,
        origin: "question_bank",
        version: question.version,
        contentRevision: question.sourceHash,
        prompt: displayQuestionPrompt(question),
        code: question.code,
        language: lesson.language,
        track: lesson.track,
        responseMode: question.taxonomy.responseMode,
        estimatedMinutes: question.estimatedMinutes,
        competency: inferMockCompetency({
          language: lesson.language,
          topics: question.taxonomy.topics,
        }),
        readinessCompetency: classifyWorldQuantCompetency({
          deckId: question.taxonomy.deckId,
          language: question.taxonomy.language,
          lessonId: question.lessonId,
          topics: question.taxonomy.topics,
          tags: question.taxonomy.tags,
        }),
        selectionTopics: [
          ...question.taxonomy.topics,
          `lesson::${question.lessonId}`,
        ],
      },
    ];
  });
}

export function legacyMockCompetencyForReadiness(
  key: WorldQuantCompetencyKey,
): MockCompetencyKey {
  switch (key) {
    case "tick_market_data":
      return "tick_data_order_book";
    case "build_delivery":
      return "engineering_quality";
    case "scripting_automation":
      return "scripting";
    case "ownership_communication":
      return "communication_ownership";
    case "modern_cpp":
    case "algorithms_data_structures":
      return "modern_cpp";
    case "concurrency_memory":
    case "performance_latency":
    case "linux_networking":
    case "distributed_data_platform":
      return "data_pipeline_performance";
  }
}

export function targetedMockCandidate(
  question: WorldQuantMockQuestion,
): TargetedMockCandidate {
  return {
    readinessCompetency: question.readinessCompetency,
    question: {
      id: question.id,
      origin: question.origin,
      version: question.version,
      contentRevision: question.contentRevision,
      estimatedMinutes: question.estimatedMinutes,
      responseMode: question.responseMode,
      language: question.language,
      track: question.track,
      execution: question.execution,
    },
  };
}

export function targetedMockCandidates(
  questions: readonly WorldQuantMockQuestion[],
) {
  return questions.map(targetedMockCandidate);
}

export function resolveTargetedMockPlan({
  plan,
  catalog,
}: {
  plan: TargetedMockPlan;
  catalog: readonly WorldQuantMockQuestion[];
}): WorldQuantMockQuestion[] | null {
  const questionByIdentity = new Map(
    catalog.map((question) => [
      `${question.origin}:${question.id}`,
      question,
    ]),
  );
  const resolved = plan.questions.flatMap((candidate) => {
    const question = questionByIdentity.get(
      `${candidate.question.origin}:${candidate.question.id}`,
    );
    return question &&
      question.version === candidate.question.version &&
      question.contentRevision ===
        candidate.question.contentRevision &&
      question.estimatedMinutes ===
        candidate.question.estimatedMinutes &&
      question.responseMode === candidate.question.responseMode &&
      question.language === candidate.question.language &&
      question.track === candidate.question.track &&
      question.readinessCompetency ===
        candidate.readinessCompetency &&
      (question.execution?.specRevision ?? null) ===
        (candidate.question.execution?.specRevision ?? null)
      ? [question]
      : [];
  });
  return resolved.length === plan.questions.length ? resolved : null;
}
