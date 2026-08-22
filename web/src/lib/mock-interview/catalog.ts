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
  TargetedMockBlueprintId,
  TargetedMockPlan,
} from "./target-plan";

export type WorldQuantMockQuestion = MockInterviewQuestion & {
  readinessCompetency: WorldQuantCompetencyKey;
  scenarioFamilies: readonly TargetedMockBlueprintId[];
};

const curatedReadinessCompetencies = {
  "worldquant-tick-feed-correctness": "tick_market_data",
  "worldquant-interval-stats-cpp": "performance_latency",
  "worldquant-legacy-migration": "ownership_communication",
  "worldquant-cpp-delivery-safety": "build_delivery",
  "worldquant-cpp-reconciliation": "performance_latency",
  "worldquant-researcher-collaboration": "ownership_communication",
  "worldquant-order-book-update-cpp": "tick_market_data",
  "worldquant-cpp-event-lifetime": "modern_cpp",
  "worldquant-partitioned-pipeline-backpressure":
    "distributed_data_platform",
  "worldquant-feed-regression-testing": "build_delivery",
  "worldquant-cpp-sequence-audit": "tick_market_data",
  "worldquant-cpp-feed-api-evolution": "modern_cpp",
  "worldquant-production-data-incident": "ownership_communication",
  "worldquant-parallel-replay-determinism": "performance_latency",
  "worldquant-cmake-sanitizer-pipeline": "build_delivery",
  "worldquant-stream-reconciliation-script": "scripting_automation",
  "worldquant-cross-asset-event-time": "tick_market_data",
  "worldquant-concurrency-code-review": "concurrency_memory",
} as const satisfies Record<string, WorldQuantCompetencyKey>;

const curatedScenarioFamilies = {
  "worldquant-tick-feed-correctness": ["new-feed"],
  "worldquant-interval-stats-cpp": ["new-feed"],
  "worldquant-legacy-migration": ["migration-incident"],
  "worldquant-cpp-delivery-safety": ["new-feed", "migration-incident"],
  "worldquant-cpp-reconciliation": ["migration-incident"],
  "worldquant-researcher-collaboration": ["migration-incident"],
  "worldquant-order-book-update-cpp": ["new-feed"],
  "worldquant-cpp-event-lifetime": ["new-feed", "migration-incident"],
  "worldquant-partitioned-pipeline-backpressure": ["new-feed"],
  "worldquant-feed-regression-testing": ["new-feed", "migration-incident"],
  "worldquant-cpp-sequence-audit": ["migration-incident"],
  "worldquant-cpp-feed-api-evolution": ["new-feed", "migration-incident"],
  "worldquant-production-data-incident": ["migration-incident"],
  "worldquant-parallel-replay-determinism": ["migration-incident"],
  "worldquant-cmake-sanitizer-pipeline": ["new-feed", "migration-incident"],
  "worldquant-stream-reconciliation-script": ["migration-incident"],
  "worldquant-cross-asset-event-time": ["new-feed"],
  "worldquant-concurrency-code-review": ["new-feed"],
} as const satisfies Record<
  string,
  readonly TargetedMockBlueprintId[]
>;

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
    const scenarioFamilies = curatedScenarioFamilies[
      question.id as keyof typeof curatedScenarioFamilies
    ];
    if (!scenarioFamilies) {
      throw new Error(
        `Curated mock question is missing a scenario family: ${question.id}`,
      );
    }
    return { ...question, readinessCompetency, scenarioFamilies };
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
        scenarioFamilies: ["new-feed", "migration-incident"],
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
      return "data_pipeline_performance";
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
      scenarioFamilies: [...question.scenarioFamilies],
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
      JSON.stringify(question.scenarioFamilies) ===
        JSON.stringify(candidate.question.scenarioFamilies ?? []) &&
      (question.execution?.specRevision ?? null) ===
        (candidate.question.execution?.specRevision ?? null)
      ? [question]
      : [];
  });
  return resolved.length === plan.questions.length ? resolved : null;
}
