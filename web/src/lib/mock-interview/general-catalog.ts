import type {
  ContentManifest,
  ContentTrack,
} from "@/lib/content/schema";
import { displayQuestionPrompt } from "@/lib/content/question-prompt";
import type { QuestionApproval } from "@/lib/practice/approvals";
import { isQuestionApproved } from "@/lib/practice/approvals";

export const GENERAL_CPP_PROFILE_ID = "cpp-engineer-general" as const;
export const GENERAL_CPP_PROFILE_VERSION = 1 as const;
export const GENERAL_CPP_PLAN_VERSION = 1 as const;

export const generalCppStandards = [
  "cpp11",
  "cpp14",
  "cpp17",
  "cpp20",
  "cpp23",
] as const;
export type GeneralCppStandard = (typeof generalCppStandards)[number];

export const generalCppCompetencies = [
  "language_core",
  "lifetime_ownership",
  "templates_generic",
  "stl_algorithms",
  "concurrency_memory",
  "performance_systems",
  "build_quality",
] as const;
export type GeneralCppCompetency = (typeof generalCppCompetencies)[number];

export type GeneralCppDuration = 30 | 45 | 60;
type QuestionDifficulty = ContentManifest["questions"][number]["difficulty"];

export const generalCppQuestionCounts: Record<GeneralCppDuration, number> = {
  30: 5,
  45: 8,
  60: 10,
};

export type GeneralCppQuestionRef = {
  id: string;
  lessonId: string;
  version: number;
  contentRevision: string;
  standard: GeneralCppStandard;
  competency: GeneralCppCompetency;
  responseMode: "text" | "code";
  estimatedMinutes: number;
};

/** Browser-safe question data. Answers, hints and rubrics never cross this boundary. */
export type GeneralCppInterviewQuestion = GeneralCppQuestionRef & {
  prompt: string;
  code?: string;
  difficulty: QuestionDifficulty;
  selectionTopics: string[];
};

export type GeneralCppInterviewPlan = {
  planVersion: typeof GENERAL_CPP_PLAN_VERSION;
  profileId: typeof GENERAL_CPP_PROFILE_ID;
  profileVersion: typeof GENERAL_CPP_PROFILE_VERSION;
  durationMinutes: GeneralCppDuration;
  seed: string;
  catalogRevision: string;
  questions: GeneralCppQuestionRef[];
};

export function parseGeneralCppDuration(
  value: string | number | undefined,
): GeneralCppDuration {
  const parsed = Number(value);
  return parsed === 30 || parsed === 45 || parsed === 60 ? parsed : 45;
}

export function buildGeneralCppInterviewCatalog({
  manifest,
  approvals,
}: {
  manifest: ContentManifest;
  approvals: readonly QuestionApproval[];
}): GeneralCppInterviewQuestion[] {
  const lessonById = new Map(
    manifest.lessons.map((lesson) => [lesson.id, lesson]),
  );

  return manifest.questions.flatMap((question) => {
    const lesson = lessonById.get(question.lessonId);
    if (
      !lesson ||
      !isGeneralCppStandard(lesson.track) ||
      question.status === "archived" ||
      (question.status !== "verified" &&
        !isQuestionApproved(question, [...approvals]))
    ) {
      return [];
    }

    const selectionTopics = uniqueStrings([
      ...question.taxonomy.topics,
      ...(question.assessmentSkills ?? []),
      ...(question.taxonomy.assessmentSkills ?? []),
      ...lesson.tags,
    ]);
    return [
      {
        id: question.id,
        lessonId: question.lessonId,
        version: question.version,
        contentRevision: question.sourceHash,
        standard: lesson.track,
        competency: inferGeneralCppCompetency(selectionTopics),
        responseMode:
          question.responseMode ?? question.taxonomy.responseMode ?? "text",
        estimatedMinutes: question.estimatedMinutes,
        prompt: displayQuestionPrompt(question),
        code: question.code,
        difficulty: question.difficulty,
        selectionTopics,
      },
    ];
  });
}

export function buildGeneralCppInterviewPlan({
  catalog,
  catalogRevision,
  durationMinutes,
  seed,
}: {
  catalog: readonly GeneralCppInterviewQuestion[];
  catalogRevision: string;
  durationMinutes: GeneralCppDuration;
  seed: string;
}): GeneralCppInterviewPlan {
  const count = generalCppQuestionCounts[durationMinutes];
  const selected: GeneralCppInterviewQuestion[] = [];
  const usedIds = new Set<string>();
  const usedLessons = new Set<string>();
  const competencyCounts = new Map<GeneralCppCompetency, number>();
  const standardCounts = new Map<GeneralCppStandard, number>();
  const difficultyCounts = new Map<QuestionDifficulty, number>();
  const topicCounts = new Map<string, number>();

  for (const [index, standard] of generalCppStandards.entries()) {
    const candidates = catalog.filter(
      (question) => question.standard === standard && !usedIds.has(question.id),
    );
    const chosen = chooseCandidate(candidates, {
      seed: `${seed}:standard:${standard}`,
      desiredDifficulty: difficultyOrder[index % difficultyOrder.length],
      usedLessons,
      competencyCounts,
      standardCounts,
      difficultyCounts,
      topicCounts,
    });
    if (!chosen) {
      throw new GeneralCppCatalogCoverageError(
        `Published interview bank has no question for ${standard}`,
      );
    }
    select(chosen);
  }

  while (selected.length < count) {
    const desiredDifficulty =
      difficultyOrder[selected.length % difficultyOrder.length];
    const chosen = chooseCandidate(
      catalog.filter((question) => !usedIds.has(question.id)),
      {
        seed: `${seed}:extra:${selected.length}`,
        desiredDifficulty,
        usedLessons,
        competencyCounts,
        standardCounts,
        difficultyCounts,
        topicCounts,
      },
    );
    if (!chosen) {
      throw new GeneralCppCatalogCoverageError(
        `Published interview bank needs at least ${count} distinct questions`,
      );
    }
    select(chosen);
  }

  return {
    planVersion: GENERAL_CPP_PLAN_VERSION,
    profileId: GENERAL_CPP_PROFILE_ID,
    profileVersion: GENERAL_CPP_PROFILE_VERSION,
    durationMinutes,
    seed,
    catalogRevision,
    questions: selected.map(questionRef),
  };

  function select(question: GeneralCppInterviewQuestion) {
    selected.push(question);
    usedIds.add(question.id);
    usedLessons.add(question.lessonId);
    increment(competencyCounts, question.competency);
    increment(standardCounts, question.standard);
    increment(difficultyCounts, question.difficulty);
    question.selectionTopics.forEach((topic) => increment(topicCounts, topic));
  }
}

export function resolveGeneralCppInterviewPlan({
  plan,
  catalog,
}: {
  plan: GeneralCppInterviewPlan;
  catalog: readonly GeneralCppInterviewQuestion[];
}) {
  const rebuilt = buildGeneralCppInterviewPlan({
    catalog,
    catalogRevision: plan.catalogRevision,
    durationMinutes: plan.durationMinutes,
    seed: plan.seed,
  });
  if (JSON.stringify(rebuilt) !== JSON.stringify(plan)) return null;
  const byId = new Map(catalog.map((question) => [question.id, question]));
  const questions = plan.questions.flatMap((question) => {
    const resolved = byId.get(question.id);
    return resolved ? [resolved] : [];
  });
  return questions.length === plan.questions.length ? questions : null;
}

export function generalCppCatalogCoverage(
  catalog: readonly GeneralCppInterviewQuestion[],
) {
  return Object.fromEntries(
    generalCppStandards.map((standard) => [
      standard,
      catalog.filter((question) => question.standard === standard).length,
    ]),
  ) as Record<GeneralCppStandard, number>;
}

export function inferGeneralCppCompetency(
  topics: readonly string[],
): GeneralCppCompetency {
  const text = topics.join("-").toLowerCase();
  const groups: Array<[GeneralCppCompetency, RegExp]> = [
    [
      "concurrency_memory",
      /thread|atomic|mutex|lock|condition|future|promise|async|memory-model|semaphore|latch|barrier|coroutine|false-sharing/,
    ],
    [
      "performance_systems",
      /performance|cache|benchmark|profil|allocation|allocator|pmr|lock-free|binary|parsing|endian|mdspan|data-oriented|hot-path/,
    ],
    [
      "lifetime_ownership",
      /lifetime|raii|ownership|move|forward|pointer|reference|unique-ptr|shared-ptr|weak-ptr|destructor|copy|value-categor/,
    ],
    [
      "templates_generic",
      /template|concept|sfinae|trait|deduction|constexpr|consteval|fold|parameter-pack|nttp|crtp|generic/,
    ],
    [
      "stl_algorithms",
      /container|iterator|algorithm|range|view|string|vector|array|map|set|queue|tuple|optional|variant|filesystem|chrono/,
    ],
    [
      "build_quality",
      /toolchain|compiler|cmake|build|test|diagnostic|module|migration|compatib|api|exception|sanitizer|ci-cd/,
    ],
  ];
  return groups.find(([, pattern]) => pattern.test(text))?.[0] ?? "language_core";
}

export class GeneralCppCatalogCoverageError extends Error {}

const difficultyOrder: QuestionDifficulty[] = [
  "intermediate",
  "advanced",
  "beginner",
];

function chooseCandidate(
  candidates: readonly GeneralCppInterviewQuestion[],
  state: {
    seed: string;
    desiredDifficulty: QuestionDifficulty;
    usedLessons: ReadonlySet<string>;
    competencyCounts: ReadonlyMap<GeneralCppCompetency, number>;
    standardCounts: ReadonlyMap<GeneralCppStandard, number>;
    difficultyCounts: ReadonlyMap<QuestionDifficulty, number>;
    topicCounts: ReadonlyMap<string, number>;
  },
) {
  return [...candidates].sort((left, right) => {
    const score = (question: GeneralCppInterviewQuestion) =>
      (state.usedLessons.has(question.lessonId) ? 1_000_000_000 : 0) +
      (state.competencyCounts.get(question.competency) ?? 0) * 100_000_000 +
      (state.standardCounts.get(question.standard) ?? 0) * 10_000_000 +
      (state.difficultyCounts.get(question.difficulty) ?? 0) * 1_000_000 +
      (question.difficulty === state.desiredDifficulty ? 0 : 500_000) +
      question.selectionTopics.reduce(
        (sum, topic) => sum + (state.topicCounts.get(topic) ?? 0) * 10_000,
        0,
      ) +
      stableHash(`${state.seed}:${question.id}`) % 10_000;
    return score(left) - score(right) || left.id.localeCompare(right.id);
  })[0];
}

function questionRef(
  question: GeneralCppInterviewQuestion,
): GeneralCppQuestionRef {
  return {
    id: question.id,
    lessonId: question.lessonId,
    version: question.version,
    contentRevision: question.contentRevision,
    standard: question.standard,
    competency: question.competency,
    responseMode: question.responseMode,
    estimatedMinutes: question.estimatedMinutes,
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function increment<K>(map: Map<K, number>, key: K) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isGeneralCppStandard(
  track: ContentTrack,
): track is GeneralCppStandard {
  return generalCppStandards.includes(track as GeneralCppStandard);
}
