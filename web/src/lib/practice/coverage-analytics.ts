import type {
  ContentQuestion,
  ContentTrack,
  PracticeDeckId,
} from "../content/schema";
import type { QuestionLearningState } from "./learning-state";
import { calculateStreak, type Review } from "./scheduler";

export const COVERAGE_STANDARDS = [
  "cpp11",
  "cpp14",
  "cpp17",
  "cpp20",
  "cpp23",
] as const satisfies readonly ContentTrack[];

export const COVERAGE_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const satisfies readonly ContentQuestion["difficulty"][];

export const RETAINED_INTERVAL_DAYS = 21;

export type CoverageStandard = (typeof COVERAGE_STANDARDS)[number];
export type CoverageDifficulty = (typeof COVERAGE_DIFFICULTIES)[number];

export type CoverageBucket = {
  total: number;
  unseen: number;
  learning: number;
  retained: number;
  due: number;
  covered: number;
  coveragePercent: number;
  retainedPercent: number;
};

export type KnowledgeCoverageAnalytics = {
  summary: CoverageBucket & {
    totalLessons: number;
    coveredLessons: number;
    totalReviews: number;
    reviewedToday: number;
    studiedDays: number;
    streak: number;
  };
  standards: Array<
    CoverageBucket & {
      standard: CoverageStandard;
      difficulties: Record<CoverageDifficulty, CoverageBucket>;
    }
  >;
  difficulties: Array<
    CoverageBucket & {
      difficulty: CoverageDifficulty;
    }
  >;
  topics: Array<CoverageBucket & { topic: string }>;
};

type MutableBucket = Pick<
  CoverageBucket,
  "total" | "unseen" | "learning" | "retained" | "due"
>;

export function isCoverageStandard(
  standard: ContentTrack,
): standard is CoverageStandard {
  return COVERAGE_STANDARDS.some((candidate) => candidate === standard);
}

export function selectCanonicalCoverageQuestions({
  repoQuestions,
  currentQuestions,
  deck,
}: {
  repoQuestions: readonly ContentQuestion[];
  currentQuestions: readonly ContentQuestion[];
  deck: PracticeDeckId;
}): ContentQuestion[] {
  const currentById = new Map(
    currentQuestions.map((question) => [question.id, question]),
  );
  return repoQuestions
    .filter(
      (question) =>
        question.status !== "archived" &&
        question.taxonomy.deckId === deck &&
        isCoverageStandard(question.taxonomy.standard),
    )
    .map((repoQuestion) => {
      const currentQuestion = currentById.get(repoQuestion.id);
      if (!currentQuestion) return repoQuestion;
      return {
        ...currentQuestion,
        lessonId: repoQuestion.lessonId,
        difficulty: repoQuestion.difficulty,
        taxonomy: {
          ...currentQuestion.taxonomy,
          standard: repoQuestion.taxonomy.standard,
          difficulty: repoQuestion.taxonomy.difficulty,
          sourceLessonId: repoQuestion.taxonomy.sourceLessonId,
          topics: repoQuestion.taxonomy.topics,
        },
      };
    });
}

export function buildKnowledgeCoverageAnalytics({
  questions,
  states,
  reviews,
  today,
}: {
  questions: readonly ContentQuestion[];
  states: readonly QuestionLearningState[];
  reviews: readonly Review[];
  today: string;
}): KnowledgeCoverageAnalytics {
  const canonicalQuestions = [...new Map(
    questions
      .filter((question) => isCoverageStandard(question.taxonomy.standard))
      .map((question) => [question.id, question]),
  ).values()];
  const canonicalQuestionIds = new Set(
    canonicalQuestions.map((question) => question.id),
  );
  const stateByQuestion = new Map(
    states.map((state) => [state.questionId, state]),
  );
  const summary = emptyBucket();
  const byStandard = new Map(
    COVERAGE_STANDARDS.map((standard) => [standard, emptyBucket()]),
  );
  const byDifficulty = new Map(
    COVERAGE_DIFFICULTIES.map((difficulty) => [difficulty, emptyBucket()]),
  );
  const byStandardDifficulty = new Map(
    COVERAGE_STANDARDS.flatMap((standard) =>
      COVERAGE_DIFFICULTIES.map((difficulty) => [
        `${standard}:${difficulty}`,
        emptyBucket(),
      ] as const),
    ),
  );
  const byTopic = new Map<string, MutableBucket>();
  const lessonCoverage = new Map<string, boolean>();

  for (const question of canonicalQuestions) {
    const standard = question.taxonomy.standard as CoverageStandard;
    const difficulty = question.difficulty as CoverageDifficulty;
    const state = stateByQuestion.get(question.id);
    const classification = classifyCoverageState(state, today);
    const buckets = [
      summary,
      byStandard.get(standard)!,
      byDifficulty.get(difficulty)!,
      byStandardDifficulty.get(`${standard}:${difficulty}`)!,
    ];
    for (const bucket of buckets) addToBucket(bucket, classification);

    const lessonWasCovered = lessonCoverage.get(question.lessonId) ?? false;
    lessonCoverage.set(
      question.lessonId,
      lessonWasCovered || classification.kind !== "unseen",
    );

    for (const topic of new Set(question.taxonomy.topics)) {
      const topicBucket = byTopic.get(topic) ?? emptyBucket();
      addToBucket(topicBucket, classification);
      byTopic.set(topic, topicBucket);
    }
  }

  const relevantReviews = reviews.filter((review) =>
    canonicalQuestionIds.has(review.questionId),
  );
  const reviewedDates = new Set(
    relevantReviews.map((review) => review.reviewedOn),
  );

  return {
    summary: {
      ...finalizeBucket(summary),
      totalLessons: lessonCoverage.size,
      coveredLessons: [...lessonCoverage.values()].filter(Boolean).length,
      totalReviews: relevantReviews.length,
      reviewedToday: relevantReviews.filter(
        (review) => review.reviewedOn === today,
      ).length,
      studiedDays: reviewedDates.size,
      streak: calculateStreak([...relevantReviews], today),
    },
    standards: COVERAGE_STANDARDS.map((standard) => ({
      standard,
      ...finalizeBucket(byStandard.get(standard)!),
      difficulties: Object.fromEntries(
        COVERAGE_DIFFICULTIES.map((difficulty) => [
          difficulty,
          finalizeBucket(
            byStandardDifficulty.get(`${standard}:${difficulty}`)!,
          ),
        ]),
      ) as Record<CoverageDifficulty, CoverageBucket>,
    })),
    difficulties: COVERAGE_DIFFICULTIES.map((difficulty) => ({
      difficulty,
      ...finalizeBucket(byDifficulty.get(difficulty)!),
    })),
    topics: [...byTopic.entries()]
      .map(([topic, bucket]) => ({ topic, ...finalizeBucket(bucket) }))
      .sort(
        (left, right) =>
          right.unseen - left.unseen ||
          right.due - left.due ||
          right.learning - left.learning ||
          left.topic.localeCompare(right.topic),
      ),
  };
}

function classifyCoverageState(
  state: QuestionLearningState | undefined,
  today: string,
): { kind: "unseen" | "learning" | "retained"; due: boolean } {
  if (!state || state.state === "new" || state.contentChanged) {
    return { kind: "unseen", due: false };
  }
  const due = Boolean(
    !state.suspended && state.dueOn && state.dueOn <= today,
  );
  const retained = Boolean(
    !state.suspended &&
      state.state === "review" &&
      state.intervalDays >= RETAINED_INTERVAL_DAYS,
  );
  return { kind: retained ? "retained" : "learning", due };
}

function emptyBucket(): MutableBucket {
  return { total: 0, unseen: 0, learning: 0, retained: 0, due: 0 };
}

function addToBucket(
  bucket: MutableBucket,
  classification: ReturnType<typeof classifyCoverageState>,
) {
  bucket.total += 1;
  bucket[classification.kind] += 1;
  if (classification.due) bucket.due += 1;
}

function finalizeBucket(bucket: MutableBucket): CoverageBucket {
  const covered = bucket.learning + bucket.retained;
  return {
    ...bucket,
    covered,
    coveragePercent: percent(covered, bucket.total),
    retainedPercent: percent(bucket.retained, bucket.total),
  };
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}
