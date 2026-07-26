import type {
  ContentLanguage,
  PracticeDeckId,
} from "@/lib/content/schema";
import type { MockCompetencyKey } from "@/lib/mock-interview/profile";
import type { QuestionLearningState } from "@/lib/practice/learning-state";

export const worldQuantCompetencyKeys = [
  "modern_cpp",
  "algorithms_data_structures",
  "concurrency_memory",
  "performance_latency",
  "linux_networking",
  "distributed_data_platform",
  "tick_market_data",
  "build_delivery",
  "scripting_automation",
  "ownership_communication",
] as const;

export type WorldQuantCompetencyKey =
  (typeof worldQuantCompetencyKeys)[number];

export type WorldQuantCompetency = {
  key: WorldQuantCompetencyKey;
  label: string;
  shortLabel: string;
  description: string;
  practiceHref: string;
  practiceLabel: string;
};

export const worldQuantCompetencies: Record<
  WorldQuantCompetencyKey,
  WorldQuantCompetency
> = {
  modern_cpp: {
    key: "modern_cpp",
    label: "Modern C++",
    shortLabel: "Modern C++",
    description:
      "Lifetime, ownership, type system, templates và các chuẩn C++11–23.",
    practiceHref: "/?deck=cpp-interview",
    practiceLabel: "Luyện C++",
  },
  algorithms_data_structures: {
    key: "algorithms_data_structures",
    label: "Algorithms & data structures",
    shortLabel: "Algorithms",
    description:
      "Độ phức tạp, container, thuật toán và lựa chọn cấu trúc dữ liệu.",
    practiceHref: "/?deck=cpp-interview",
    practiceLabel: "Luyện algorithms",
  },
  concurrency_memory: {
    key: "concurrency_memory",
    label: "Concurrency & memory",
    shortLabel: "Concurrency",
    description:
      "Memory model, atomics, synchronization, races và ownership đa luồng.",
    practiceHref: "/?deck=cpp-interview",
    practiceLabel: "Luyện concurrency",
  },
  performance_latency: {
    key: "performance_latency",
    label: "Performance & latency",
    shortLabel: "Performance",
    description:
      "Allocation, cache, throughput, tail latency, profiling và benchmark.",
    practiceHref: "/?deck=cpp-interview",
    practiceLabel: "Luyện performance",
  },
  linux_networking: {
    key: "linux_networking",
    label: "Linux & networking",
    shortLabel: "Linux / network",
    description:
      "Unix/Linux, I/O, sockets, protocols và quan sát hệ thống production.",
    practiceHref: "/?deck=cpp-interview",
    practiceLabel: "Luyện systems",
  },
  distributed_data_platform: {
    key: "distributed_data_platform",
    label: "Distributed data platforms",
    shortLabel: "Data platform",
    description:
      "RPC, partitioning, replication, storage, streaming và backpressure.",
    practiceHref: "/?deck=cpp-interview",
    practiceLabel: "Luyện data platform",
  },
  tick_market_data: {
    key: "tick_market_data",
    label: "Tick & market data",
    shortLabel: "Tick data",
    description:
      "Feed sequencing, order book, replay, data quality và interval features.",
    practiceHref: "/learn/tick-data-order-book",
    practiceLabel: "Học Tick data",
  },
  build_delivery: {
    key: "build_delivery",
    label: "Build, testing & delivery",
    shortLabel: "Build / delivery",
    description:
      "CMake, testing, sanitizers, CI/CD, Git và release discipline.",
    practiceHref: "/learn/cmake",
    practiceLabel: "Học CMake",
  },
  scripting_automation: {
    key: "scripting_automation",
    label: "Scripting & automation",
    shortLabel: "Scripting",
    description:
      "Python/Perl tooling, reconciliation, migration và vận hành dữ liệu.",
    practiceHref: "/?deck=python-interview",
    practiceLabel: "Luyện Python",
  },
  ownership_communication: {
    key: "ownership_communication",
    label: "Ownership & communication",
    shortLabel: "Ownership",
    description:
      "Product ownership, incident thinking và phối hợp với researchers.",
    practiceHref: "/mock-interview",
    practiceLabel: "Luyện qua mock",
  },
};

export const worldQuantRoleProfileIds = [
  "tick-data-platform",
  "cpp-data-platform",
  "low-latency-cpp",
  "senior-cpp-platform",
] as const;

export type WorldQuantRoleProfileId =
  (typeof worldQuantRoleProfileIds)[number];

export type WorldQuantRoleProfile = {
  id: WorldQuantRoleProfileId;
  version: 1;
  label: string;
  eyebrow: string;
  summary: string;
  coreCompetencies: readonly WorldQuantCompetencyKey[];
  weights: Record<WorldQuantCompetencyKey, number>;
  targets: Record<WorldQuantCompetencyKey, number>;
};

export const worldQuantRoleProfiles: readonly WorldQuantRoleProfile[] = [
  {
    id: "tick-data-platform",
    version: 1,
    label: "Tick Data Platform Engineer",
    eyebrow: "JD mục tiêu hiện tại",
    summary:
      "Modern C++, feed/order book, interval statistics, migration và phối hợp với research.",
    coreCompetencies: [
      "modern_cpp",
      "concurrency_memory",
      "performance_latency",
      "tick_market_data",
    ],
    weights: {
      modern_cpp: 20,
      algorithms_data_structures: 8,
      concurrency_memory: 12,
      performance_latency: 12,
      linux_networking: 5,
      distributed_data_platform: 5,
      tick_market_data: 18,
      build_delivery: 8,
      scripting_automation: 5,
      ownership_communication: 7,
    },
    targets: {
      modern_cpp: 6,
      algorithms_data_structures: 3,
      concurrency_memory: 4,
      performance_latency: 5,
      linux_networking: 3,
      distributed_data_platform: 4,
      tick_market_data: 6,
      build_delivery: 4,
      scripting_automation: 3,
      ownership_communication: 3,
    },
  },
  {
    id: "cpp-data-platform",
    version: 1,
    label: "C++ Data Platform Engineer",
    eyebrow: "Distributed systems",
    summary:
      "Storage/compute services, RPC, routing, partitioning, replication và Linux systems.",
    coreCompetencies: [
      "modern_cpp",
      "concurrency_memory",
      "linux_networking",
      "distributed_data_platform",
    ],
    weights: {
      modern_cpp: 18,
      algorithms_data_structures: 12,
      concurrency_memory: 12,
      performance_latency: 10,
      linux_networking: 12,
      distributed_data_platform: 20,
      tick_market_data: 0,
      build_delivery: 8,
      scripting_automation: 3,
      ownership_communication: 5,
    },
    targets: {
      modern_cpp: 6,
      algorithms_data_structures: 4,
      concurrency_memory: 5,
      performance_latency: 4,
      linux_networking: 5,
      distributed_data_platform: 6,
      tick_market_data: 3,
      build_delivery: 4,
      scripting_automation: 3,
      ownership_communication: 3,
    },
  },
  {
    id: "low-latency-cpp",
    version: 1,
    label: "Low-latency C++ Engineer",
    eyebrow: "Performance systems",
    summary:
      "High-throughput C++, memory/concurrency, networking, profiling và latency engineering.",
    coreCompetencies: [
      "modern_cpp",
      "concurrency_memory",
      "performance_latency",
      "linux_networking",
    ],
    weights: {
      modern_cpp: 20,
      algorithms_data_structures: 12,
      concurrency_memory: 15,
      performance_latency: 20,
      linux_networking: 15,
      distributed_data_platform: 8,
      tick_market_data: 3,
      build_delivery: 5,
      scripting_automation: 0,
      ownership_communication: 2,
    },
    targets: {
      modern_cpp: 6,
      algorithms_data_structures: 4,
      concurrency_memory: 6,
      performance_latency: 6,
      linux_networking: 5,
      distributed_data_platform: 3,
      tick_market_data: 3,
      build_delivery: 3,
      scripting_automation: 2,
      ownership_communication: 2,
    },
  },
  {
    id: "senior-cpp-platform",
    version: 1,
    label: "Senior C++ Platform Engineer",
    eyebrow: "Broad platform ownership",
    summary:
      "C++ design depth, production systems, delivery quality và technical ownership.",
    coreCompetencies: [
      "modern_cpp",
      "concurrency_memory",
      "distributed_data_platform",
      "build_delivery",
    ],
    weights: {
      modern_cpp: 22,
      algorithms_data_structures: 10,
      concurrency_memory: 14,
      performance_latency: 12,
      linux_networking: 8,
      distributed_data_platform: 12,
      tick_market_data: 5,
      build_delivery: 10,
      scripting_automation: 3,
      ownership_communication: 4,
    },
    targets: {
      modern_cpp: 6,
      algorithms_data_structures: 4,
      concurrency_memory: 5,
      performance_latency: 5,
      linux_networking: 4,
      distributed_data_platform: 4,
      tick_market_data: 3,
      build_delivery: 4,
      scripting_automation: 2,
      ownership_communication: 4,
    },
  },
] as const;

export const DEFAULT_WORLDQUANT_ROLE_PROFILE_ID =
  "tick-data-platform" as const;

export type ReadinessQuestionSignal = {
  deckId: PracticeDeckId;
  language?: ContentLanguage;
  lessonId: string;
  topics: string[];
  tags?: string[];
};

export type ReadinessQuestionSummary = {
  id: string;
  version: number;
  sourceHash: string;
  deckId: PracticeDeckId;
  lessonId: string;
  estimatedMinutes: number;
  competency: WorldQuantCompetencyKey;
  validation: "repository_verified" | "owner_approved";
};

export type CompetencyReadiness = {
  key: WorldQuantCompetencyKey;
  weight: number;
  target: number;
  repositoryVerifiedCount: number;
  ownerApprovedCount: number;
  effectiveCount: number;
  coveragePercent: number;
  learningWithinCoveragePercent: number;
  preparedPercent: number;
  learnedCount: number;
  matureCount: number;
  dueCount: number;
  status: CompetencyReadinessStatus;
  gapKind: "content" | "learning" | "mixed";
  gapContribution: number;
};

export type CompetencyReadinessStatus =
  | "no_evidence"
  | "starting"
  | "developing"
  | "practiced"
  | "strong";

export type ReadinessHeadlineStatus =
  | "limited_evidence"
  | "foundation"
  | "building"
  | "mock_ready"
  | "well_rehearsed";

export type WorldQuantReadinessSnapshot = {
  profileId: WorldQuantRoleProfileId;
  preparationIndex: number;
  coveragePercent: number;
  status: ReadinessHeadlineStatus;
  questionCount: number;
  repositoryVerifiedCount: number;
  ownerApprovedCount: number;
  learnedCount: number;
  matureCount: number;
  dueCount: number;
  newCount: number;
  competencies: CompetencyReadiness[];
  priorityCompetencies: WorldQuantCompetencyKey[];
};

const classifierOrder: readonly WorldQuantCompetencyKey[] = [
  "tick_market_data",
  "ownership_communication",
  "distributed_data_platform",
  "concurrency_memory",
  "algorithms_data_structures",
  "linux_networking",
  "build_delivery",
  "scripting_automation",
  "modern_cpp",
  "performance_latency",
];

const competencyKeywords: Record<
  WorldQuantCompetencyKey,
  ReadonlySet<string>
> = {
  modern_cpp: new Set([
    "aggregate",
    "capture",
    "class-design",
    "compile-time",
    "constexpr",
    "enum",
    "final",
    "initialization",
    "lambda",
    "lifetime",
    "move-semantics",
    "object-model",
    "override",
    "ownership",
    "reference",
    "special-member-function",
    "templates",
    "type-deduction",
    "type-safety",
  ]),
  algorithms_data_structures: new Set([
    "algorithm",
    "algorithms",
    "array",
    "bounds",
    "complexity",
    "container",
    "data-structure",
    "hash",
    "iteration",
    "map",
    "sort",
    "sorting",
  ]),
  concurrency_memory: new Set([
    "atomic",
    "concurrency",
    "lock",
    "lock-free",
    "memory-model",
    "mutex",
    "parallelism",
    "queue",
    "race",
    "synchronization",
    "thread",
  ]),
  performance_latency: new Set([
    "alignment",
    "allocation",
    "benchmark",
    "branch-prediction",
    "cache",
    "false-sharing",
    "latency",
    "performance",
    "profiling",
    "simd",
    "throughput",
  ]),
  linux_networking: new Set([
    "io",
    "linux",
    "networking",
    "protocol",
    "socket",
    "unix",
  ]),
  distributed_data_platform: new Set([
    "backpressure",
    "columnar",
    "consensus",
    "data-parity",
    "distributed",
    "distributed-systems",
    "legacy-migration",
    "partitioning",
    "replication",
    "rpc",
    "storage",
    "streaming",
  ]),
  tick_market_data: new Set([
    "binary-parsing",
    "feed",
    "fixed-point",
    "interval-statistics",
    "market-by-order",
    "market-by-price",
    "market-data",
    "order-book",
    "replay",
    "sequencing",
    "tick-data",
    "vwap",
  ]),
  build_delivery: new Set([
    "build",
    "build-system",
    "ci-cd",
    "cmake",
    "git",
    "sanitizer",
    "testing",
  ]),
  scripting_automation: new Set([
    "automation",
    "perl",
    "python",
    "reconciliation",
    "scripting",
  ]),
  ownership_communication: new Set([
    "communication",
    "english",
    "incident",
    "migration",
    "product-ownership",
    "stakeholder",
  ]),
};

export function classifyWorldQuantCompetency(
  signal: ReadinessQuestionSignal,
): WorldQuantCompetencyKey {
  if (signal.deckId === "cmake-build-systems") return "build_delivery";
  if (signal.deckId === "python-interview") return "scripting_automation";

  const tokens = new Set([
    signal.lessonId,
    ...signal.topics,
    ...(signal.tags ?? []).map((tag) => tag.split("::").at(-1) ?? tag),
  ]);
  let bestKey: WorldQuantCompetencyKey = "modern_cpp";
  let bestScore = 0;
  for (const key of classifierOrder) {
    const score = [...competencyKeywords[key]].filter((keyword) =>
      tokens.has(keyword),
    ).length;
    if (score > bestScore) {
      bestKey = key;
      bestScore = score;
    }
  }
  return bestKey;
}

export function parseWorldQuantRoleProfile(
  value: string | null | undefined,
): WorldQuantRoleProfileId {
  return worldQuantRoleProfileIds.includes(
    value as WorldQuantRoleProfileId,
  )
    ? (value as WorldQuantRoleProfileId)
    : DEFAULT_WORLDQUANT_ROLE_PROFILE_ID;
}

export function worldQuantRoleProfileById(
  id: WorldQuantRoleProfileId,
): WorldQuantRoleProfile {
  return worldQuantRoleProfiles.find((profile) => profile.id === id)!;
}

export function learningEvidence(
  state: QuestionLearningState | undefined,
): number {
  if (!state || state.suspended || state.state === "new") return 0;

  let evidence =
    state.state === "learning"
      ? 0.35
      : state.state === "relearning"
        ? 0.15
        : state.intervalDays >= 21
          ? 1
          : state.intervalDays >= 7
            ? 0.75
            : 0.5;
  if (state.contentChanged) evidence = Math.min(evidence, 0.15);
  if (state.leech) evidence = Math.min(evidence, 0.25);
  return evidence;
}

export function isValidReadinessDateKey(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

export function mapLegacyMockCompetency({
  key,
  topics = [],
}: {
  key: MockCompetencyKey;
  topics?: readonly string[];
}): {
  key: WorldQuantCompetencyKey;
  granularity: "direct" | "topic_refined" | "legacy_fallback";
} {
  const direct: Partial<
    Record<MockCompetencyKey, WorldQuantCompetencyKey>
  > = {
    tick_data_order_book: "tick_market_data",
    engineering_quality: "build_delivery",
    scripting: "scripting_automation",
    communication_ownership: "ownership_communication",
  };
  if (direct[key]) return { key: direct[key]!, granularity: "direct" };

  const refinedSignal: ReadinessQuestionSignal = {
    deckId: "cpp-interview",
    lessonId: "legacy-mock",
    topics: [...topics],
  };
  const refined = classifyWorldQuantCompetency(refinedSignal);
  const allowed =
    key === "modern_cpp"
      ? new Set<WorldQuantCompetencyKey>([
          "modern_cpp",
          "algorithms_data_structures",
        ])
      : new Set<WorldQuantCompetencyKey>([
          "concurrency_memory",
          "performance_latency",
          "distributed_data_platform",
        ]);
  if (topics.length > 0 && allowed.has(refined)) {
    return { key: refined, granularity: "topic_refined" };
  }
  return {
    key: key === "modern_cpp" ? "modern_cpp" : "performance_latency",
    granularity: "legacy_fallback",
  };
}

export function buildWorldQuantReadiness({
  profileId,
  questions,
  states,
  today,
}: {
  profileId: WorldQuantRoleProfileId;
  questions: readonly ReadinessQuestionSummary[];
  states: ReadonlyMap<string, QuestionLearningState>;
  today: string;
}): WorldQuantReadinessSnapshot {
  const profile = worldQuantRoleProfileById(profileId);
  const roleQuestions = questions.filter(
    (question) => profile.weights[question.competency] > 0,
  );
  const activeStates = roleQuestions
    .map((question) => states.get(question.id))
    .filter((state): state is QuestionLearningState => Boolean(state))
    .filter((state) => !state.suspended);
  const competencies = worldQuantCompetencyKeys.map((key) => {
    const weight = profile.weights[key];
    const target = profile.targets[key];
    const relevantQuestions = questions.filter(
      (question) => question.competency === key,
    );
    const evidenceQuestions = capQuestionsPerLesson(
      relevantQuestions,
      states,
    );
    const evidenceTotal = evidenceQuestions.reduce(
      (sum, question) => sum + learningEvidence(states.get(question.id)),
      0,
    );
    const effectiveCount = evidenceQuestions.length;
    const coverage = Math.min(1, effectiveCount / target);
    const prepared = Math.min(1, evidenceTotal / target);
    const coveragePercent = Math.round(coverage * 100);
    const preparedPercent = Math.round(prepared * 100);
    const learningWithinCoveragePercent =
      effectiveCount === 0
        ? 0
        : Math.round((evidenceTotal / effectiveCount) * 100);
    const relevantStates = evidenceQuestions
      .map((question) => states.get(question.id))
      .filter((state): state is QuestionLearningState => Boolean(state))
      .filter((state) => !state.suspended);

    return {
      key,
      weight,
      target,
      repositoryVerifiedCount: relevantQuestions.filter(
        (question) => question.validation === "repository_verified",
      ).length,
      ownerApprovedCount: relevantQuestions.filter(
        (question) => question.validation === "owner_approved",
      ).length,
      effectiveCount,
      coveragePercent,
      learningWithinCoveragePercent,
      preparedPercent,
      learnedCount: relevantStates.filter((state) => state.state !== "new")
        .length,
      matureCount: relevantStates.filter(
        (state) => state.state === "review" && state.intervalDays >= 21,
      ).length,
      dueCount: relevantStates.filter(
        (state) => state.dueOn !== null && state.dueOn <= today,
      ).length,
      status: competencyStatus(preparedPercent, effectiveCount),
      gapKind: competencyGapKind({
        coveragePercent,
        learningWithinCoveragePercent,
        effectiveCount,
      }),
      gapContribution: Math.round(weight * (1 - prepared)),
    } satisfies CompetencyReadiness;
  });
  const preparationIndex = Math.round(
    competencies.reduce(
      (sum, competency) =>
        sum + competency.preparedPercent * (competency.weight / 100),
      0,
    ),
  );
  const coveragePercent = Math.round(
    competencies.reduce(
      (sum, competency) =>
        sum + competency.coveragePercent * (competency.weight / 100),
      0,
    ),
  );
  const coreCoverageLimited = profile.coreCompetencies.some((key) => {
    const competency = competencies.find((item) => item.key === key)!;
    return competency.coveragePercent < 50;
  });
  const priorityCompetencies = competencies
    .filter((competency) => competency.weight > 0)
    .sort(
      (left, right) =>
        right.gapContribution - left.gapContribution ||
        left.key.localeCompare(right.key),
    )
    .slice(0, 3)
    .map((competency) => competency.key);

  return {
    profileId,
    preparationIndex,
    coveragePercent,
    status: headlineStatus({
      preparationIndex,
      limitedEvidence: coveragePercent < 60 || coreCoverageLimited,
    }),
    questionCount: roleQuestions.length,
    repositoryVerifiedCount: roleQuestions.filter(
      (question) => question.validation === "repository_verified",
    ).length,
    ownerApprovedCount: roleQuestions.filter(
      (question) => question.validation === "owner_approved",
    ).length,
    learnedCount: activeStates.filter((state) => state.state !== "new").length,
    matureCount: activeStates.filter(
      (state) => state.state === "review" && state.intervalDays >= 21,
    ).length,
    dueCount: activeStates.filter(
      (state) => state.dueOn !== null && state.dueOn <= today,
    ).length,
    newCount: activeStates.filter((state) => state.state === "new").length,
    competencies,
    priorityCompetencies,
  };
}

function capQuestionsPerLesson(
  questions: readonly ReadinessQuestionSummary[],
  states: ReadonlyMap<string, QuestionLearningState>,
) {
  const byLesson = new Map<string, ReadinessQuestionSummary[]>();
  for (const question of questions) {
    const lessonQuestions = byLesson.get(question.lessonId) ?? [];
    lessonQuestions.push(question);
    byLesson.set(question.lessonId, lessonQuestions);
  }
  return [...byLesson.values()].flatMap((lessonQuestions) =>
    [...lessonQuestions]
      .sort(
        (left, right) =>
          learningEvidence(states.get(right.id)) -
            learningEvidence(states.get(left.id)) ||
          left.id.localeCompare(right.id),
      )
      .slice(0, 2),
  );
}

function competencyStatus(
  preparedPercent: number,
  evidenceCount: number,
): CompetencyReadinessStatus {
  if (evidenceCount === 0) return "no_evidence";
  if (preparedPercent >= 80) return "strong";
  if (preparedPercent >= 60) return "practiced";
  if (preparedPercent >= 30) return "developing";
  return "starting";
}

function competencyGapKind({
  coveragePercent,
  learningWithinCoveragePercent,
  effectiveCount,
}: {
  coveragePercent: number;
  learningWithinCoveragePercent: number;
  effectiveCount: number;
}): CompetencyReadiness["gapKind"] {
  const contentGap = coveragePercent < 100;
  const learningGap =
    effectiveCount > 0 && learningWithinCoveragePercent < 80;
  if (contentGap && learningGap) return "mixed";
  return contentGap ? "content" : "learning";
}

function headlineStatus({
  preparationIndex,
  limitedEvidence,
}: {
  preparationIndex: number;
  limitedEvidence: boolean;
}): ReadinessHeadlineStatus {
  if (limitedEvidence) return "limited_evidence";
  if (preparationIndex < 35) return "foundation";
  if (preparationIndex < 60) return "building";
  if (preparationIndex < 80) return "mock_ready";
  return "well_rehearsed";
}

for (const profile of worldQuantRoleProfiles) {
  const totalWeight = Object.values(profile.weights).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  if (totalWeight !== 100) {
    throw new Error(`${profile.id} competency weights must total 100`);
  }
  if (
    Object.keys(profile.weights).length !== worldQuantCompetencyKeys.length ||
    Object.keys(profile.targets).length !== worldQuantCompetencyKeys.length
  ) {
    throw new Error(`${profile.id} must define every competency`);
  }
}
