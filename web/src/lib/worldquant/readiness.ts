import type {
  ContentLanguage,
  PracticeDeckId,
} from "@/lib/content/schema";
import type { MockCompetencyKey } from "@/lib/mock-interview/profile";
import type {
  CompetencyEvidenceProjection,
  EvidenceProjection,
} from "@/lib/evidence/engine";
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
    label: "C++ hiện đại",
    shortLabel: "C++ hiện đại",
    description:
      "Vòng đời, quyền sở hữu, hệ thống kiểu, mẫu (template) và các chuẩn C++11–23.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện C++",
  },
  algorithms_data_structures: {
    key: "algorithms_data_structures",
    label: "Thuật toán và cấu trúc dữ liệu",
    shortLabel: "Thuật toán",
    description:
      "Độ phức tạp, cấu trúc chứa (container), thuật toán và cách lựa chọn cấu trúc dữ liệu.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện thuật toán",
  },
  concurrency_memory: {
    key: "concurrency_memory",
    label: "Đồng thời và bộ nhớ",
    shortLabel: "Lập trình đồng thời",
    description:
      "Mô hình bộ nhớ, thao tác nguyên tử, đồng bộ, tranh chấp dữ liệu và quyền sở hữu đa luồng.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện lập trình đồng thời",
  },
  performance_latency: {
    key: "performance_latency",
    label: "Hiệu năng và độ trễ",
    shortLabel: "Hiệu năng",
    description:
      "Cấp phát bộ nhớ, bộ nhớ đệm, thông lượng, độ trễ đuôi, phân tích và đo hiệu năng.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện hiệu năng",
  },
  linux_networking: {
    key: "linux_networking",
    label: "Linux và mạng",
    shortLabel: "Linux / mạng",
    description:
      "Unix/Linux, I/O, socket, giao thức và khả năng quan sát hệ thống thực tế.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện hệ thống",
  },
  distributed_data_platform: {
    key: "distributed_data_platform",
    label: "Nền tảng dữ liệu phân tán",
    shortLabel: "Nền tảng dữ liệu",
    description:
      "RPC, phân vùng, sao chép, lưu trữ, xử lý luồng và kiểm soát quá tải.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện nền tảng dữ liệu",
  },
  tick_market_data: {
    key: "tick_market_data",
    label: "Dữ liệu tick và dữ liệu thị trường",
    shortLabel: "Dữ liệu tick",
    description:
      "Trình tự nguồn dữ liệu, sổ lệnh (order book), phát lại, chất lượng dữ liệu và đặc trưng theo khoảng thời gian.",
    practiceHref: "/learn/tick-data-order-book",
    practiceLabel: "Học dữ liệu tick",
  },
  build_delivery: {
    key: "build_delivery",
    label: "Dựng, kiểm thử và phát hành",
    shortLabel: "Dựng / phát hành",
    description:
      "Kiểm thử C++, công cụ phát hiện lỗi (sanitizer), CI/CD, Git và quy trình phát hành.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện C++",
  },
  scripting_automation: {
    key: "scripting_automation",
    label: "Viết tập lệnh và tự động hóa",
    shortLabel: "Tự động hóa",
    description:
      "Công cụ C++ đối soát, chuyển đổi và vận hành dữ liệu theo luồng.",
    practiceHref: "/practice?deck=cpp-interview",
    practiceLabel: "Luyện C++",
  },
  ownership_communication: {
    key: "ownership_communication",
    label: "Tinh thần làm chủ và giao tiếp",
    shortLabel: "Làm chủ công việc",
    description:
      "Chủ động chịu trách nhiệm về sản phẩm, xử lý sự cố và phối hợp với nhà nghiên cứu.",
    practiceHref: "/mock-interview",
    practiceLabel: "Luyện qua phỏng vấn thử",
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

/**
 * Version is part of the evidence contract, not a display label. A completed
 * mock must continue to be interpreted with the weights it was created with.
 */
export type WorldQuantRoleProfileVersion = 1 | 2;

export type WorldQuantRoleProfile = {
  id: WorldQuantRoleProfileId;
  version: WorldQuantRoleProfileVersion;
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
    version: 2,
    label: "Kỹ sư nền tảng dữ liệu tick",
    eyebrow: "Mô tả công việc mục tiêu hiện tại",
    summary:
      "C++ hiện đại, nguồn dữ liệu và sổ lệnh, thống kê theo khoảng thời gian, chuyển đổi hệ thống và phối hợp nghiên cứu.",
    coreCompetencies: [
      "modern_cpp",
      "concurrency_memory",
      "performance_latency",
      "tick_market_data",
    ],
    weights: {
      modern_cpp: 22,
      algorithms_data_structures: 6,
      concurrency_memory: 8,
      performance_latency: 8,
      linux_networking: 2,
      distributed_data_platform: 10,
      tick_market_data: 22,
      build_delivery: 10,
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
    label: "Kỹ sư nền tảng dữ liệu C++",
    eyebrow: "Hệ thống phân tán",
    summary:
      "Dịch vụ lưu trữ/tính toán, RPC, định tuyến, phân vùng, sao chép và hệ thống Linux.",
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
    label: "Kỹ sư C++ độ trễ thấp",
    eyebrow: "Hệ thống hiệu năng cao",
    summary:
      "C++ thông lượng cao, bộ nhớ/lập trình đồng thời, mạng, phân tích hiệu năng và kỹ thuật tối ưu độ trễ.",
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
    label: "Kỹ sư nền tảng C++ cấp cao",
    eyebrow: "Làm chủ nền tảng toàn diện",
    summary:
      "Thiết kế C++ chuyên sâu, hệ thống thực tế, chất lượng phát hành và tinh thần làm chủ kỹ thuật.",
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
  validation:
    | "repository_verified"
    | "owner_approved"
    | "personal_remediation";
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
  attemptEvidenceStatus: CompetencyEvidenceProjection["status"];
  attemptEvidenceScore: number | null;
  attemptAssessmentCount: number;
  attemptNextAction: CompetencyEvidenceProjection["nextAction"];
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

/**
 * Frozen v1 profile used only while parsing historical mock evidence. Keep it
 * next to the active v2 profile so a report's score never changes after a JD
 * calibration update.
 */
const historicalWorldQuantRoleProfiles: readonly WorldQuantRoleProfile[] = [
  {
    id: "tick-data-platform",
    version: 1,
    label: "Kỹ sư nền tảng dữ liệu tick",
    eyebrow: "Mô tả công việc mục tiêu trước đây",
    summary:
      "C++ hiện đại, nguồn dữ liệu và sổ lệnh, thống kê theo khoảng thời gian, chuyển đổi hệ thống và phối hợp nghiên cứu.",
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
] as const;

export function worldQuantRoleProfileByVersion({
  id,
  version,
}: {
  id: WorldQuantRoleProfileId;
  version: WorldQuantRoleProfileVersion;
}): WorldQuantRoleProfile {
  const active = worldQuantRoleProfiles.find(
    (profile) => profile.id === id && profile.version === version,
  );
  if (active) return active;
  const historical = historicalWorldQuantRoleProfiles.find(
    (profile) => profile.id === id && profile.version === version,
  );
  if (historical) return historical;
  throw new RangeError(`Unknown WorldQuant role profile version: ${id}@${version}`);
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
  attemptEvidence,
}: {
  profileId: WorldQuantRoleProfileId;
  questions: readonly ReadinessQuestionSummary[];
  states: ReadonlyMap<string, QuestionLearningState>;
  today: string;
  attemptEvidence?: EvidenceProjection;
}): WorldQuantReadinessSnapshot {
  const profile = worldQuantRoleProfileById(profileId);
  const roleQuestions = questions.filter(
    (question) => profile.weights[question.competency] > 0,
  );
  const canonicalRoleQuestions = roleQuestions.filter(
    (question) => question.validation !== "personal_remediation",
  );
  const activeStates = roleQuestions
    .map((question) => states.get(question.id))
    .filter((state): state is QuestionLearningState => Boolean(state))
    .filter((state) => !state.suspended);
  const attemptEvidenceByCompetency = new Map(
    (attemptEvidence?.competencies ?? []).map((competency) => [
      competency.key,
      competency,
    ]),
  );
  const competencies = worldQuantCompetencyKeys.map((key) => {
    const weight = profile.weights[key];
    const target = profile.targets[key];
    const relevantQuestions = questions.filter(
      (question) =>
        question.competency === key &&
        question.validation !== "personal_remediation",
    );
    const remediationQuestions = questions.filter(
      (question) =>
        question.competency === key &&
        question.validation === "personal_remediation",
    );
    const evidenceQuestions = capQuestionsPerLesson(
      relevantQuestions,
      states,
    );
    const attempt = attemptEvidenceByCompetency.get(key);
    const attemptUnit = attemptEvidenceUnit(attempt);
    const evidenceTotal = evidenceQuestions.reduce(
      (sum, question) => sum + learningEvidence(states.get(question.id)),
      0,
    ) + capQuestionsPerLesson(remediationQuestions, states).reduce(
      (sum, question) => sum + learningEvidence(states.get(question.id)),
      0,
    ) + attemptUnit;
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
      attemptEvidenceStatus: attempt?.status ?? "unassessed",
      attemptEvidenceScore: attempt?.score ?? null,
      attemptAssessmentCount: attempt?.assessmentCount ?? 0,
      attemptNextAction: attempt?.nextAction ?? "assess",
      status: competencyStatus(
        preparedPercent,
        effectiveCount + (attempt && attempt.assessmentCount > 0 ? 1 : 0),
      ),
      gapKind: competencyGapKind({
        coveragePercent,
        learningWithinCoveragePercent,
        effectiveCount,
        attemptStatus: attempt?.status ?? "unassessed",
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
    questionCount: canonicalRoleQuestions.length,
    repositoryVerifiedCount: canonicalRoleQuestions.filter(
      (question) => question.validation === "repository_verified",
    ).length,
    ownerApprovedCount: canonicalRoleQuestions.filter(
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
  attemptStatus,
}: {
  coveragePercent: number;
  learningWithinCoveragePercent: number;
  effectiveCount: number;
  attemptStatus: CompetencyEvidenceProjection["status"];
}): CompetencyReadiness["gapKind"] {
  const contentGap = coveragePercent < 100;
  const learningGap =
    (effectiveCount > 0 && learningWithinCoveragePercent < 80) ||
    attemptStatus === "learning" ||
    attemptStatus === "stale";
  if (contentGap && learningGap) return "mixed";
  return contentGap ? "content" : "learning";
}

function attemptEvidenceUnit(
  evidence: CompetencyEvidenceProjection | undefined,
) {
  if (!evidence) return 0;
  if (evidence.status === "verified") return 1;
  if (evidence.status === "stale") return 0.5;
  if (evidence.status === "learning") {
    return ((evidence.score ?? 0) / 100) * 0.5;
  }
  return 0;
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
