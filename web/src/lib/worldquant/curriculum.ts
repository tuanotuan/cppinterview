import {
  worldQuantCompetencyKeys,
  type WorldQuantCompetencyKey,
} from "./readiness";

export const WORLDQUANT_CURRICULUM_VERSION = 1 as const;

export type WorldQuantConceptId =
  | "cpp-lifetime-ownership"
  | "cpp-types-templates"
  | "cpp-standards-idioms"
  | "algorithms-complexity"
  | "algorithms-containers"
  | "algorithms-streaming"
  | "concurrency-memory-model"
  | "concurrency-synchronization"
  | "concurrency-backpressure"
  | "performance-cache-allocation"
  | "performance-profiling"
  | "performance-capacity"
  | "linux-process-io"
  | "linux-network-protocols"
  | "linux-observability"
  | "distributed-partitioning"
  | "distributed-streaming"
  | "distributed-consistency"
  | "tick-feed-integrity"
  | "tick-order-book"
  | "tick-interval-features"
  | "build-target-cmake"
  | "build-test-sanitizer"
  | "build-ci-release"
  | "scripting-python-data"
  | "scripting-perl-legacy"
  | "scripting-reconciliation"
  | "ownership-requirements"
  | "ownership-incidents"
  | "ownership-english";

export type WorldQuantConcept = {
  id: WorldQuantConceptId;
  competency: WorldQuantCompetencyKey;
  label: string;
  summary: string;
  prerequisites: readonly WorldQuantConceptId[];
  signals: readonly string[];
  guideHref: string | null;
};

export type CurriculumQuestionEvidenceKind =
  | "repository_verified"
  | "owner_approved"
  | "pending_review"
  | "personal_remediation";

export type CurriculumQuestionEvidence = {
  id: string;
  competency: WorldQuantCompetencyKey;
  lessonId: string;
  topics: readonly string[];
  tags: readonly string[];
  evidenceKind: CurriculumQuestionEvidenceKind;
};

export type CurriculumDrillEvidence = {
  id: string;
  conceptIds: readonly WorldQuantConceptId[];
  variant: "practice" | "checkpoint";
};

export type CurriculumConceptCoverageStatus =
  | "transfer_ready"
  | "flashcard_only"
  | "pending_review"
  | "drill_only"
  | "content_gap";

export type CurriculumConceptCoverage = {
  concept: WorldQuantConcept;
  status: CurriculumConceptCoverageStatus;
  activeQuestionIds: string[];
  pendingQuestionIds: string[];
  personalRemediationIds: string[];
  practiceDrillIds: string[];
  checkpointDrillIds: string[];
};

export type CurriculumCompetencyCoverage = {
  competency: WorldQuantCompetencyKey;
  conceptCount: number;
  coveredConceptCount: number;
  transferReadyConceptCount: number;
  activeQuestionCount: number;
  pendingQuestionCount: number;
  practiceDrillCount: number;
  checkpointDrillCount: number;
};

export type WorldQuantCurriculumCoverage = {
  version: typeof WORLDQUANT_CURRICULUM_VERSION;
  concepts: CurriculumConceptCoverage[];
  competencies: Record<
    WorldQuantCompetencyKey,
    CurriculumCompetencyCoverage
  >;
  unclassifiedQuestionIds: string[];
};

export const worldQuantConcepts: readonly WorldQuantConcept[] = [
  concept(
    "cpp-lifetime-ownership",
    "modern_cpp",
    "Lifetime & ownership",
    "RAII, value semantics, references, views và resource lifetime trên hot path.",
    [],
    [
      "lifetime",
      "ownership",
      "raii",
      "reference",
      "pointer",
      "smart-pointer",
      "string-view",
      "span",
      "move-semantics",
    ],
    null,
  ),
  concept(
    "cpp-types-templates",
    "modern_cpp",
    "Type system & templates",
    "Const-correctness, deduction, concepts, generic code và compile-time contracts.",
    ["cpp-lifetime-ownership"],
    [
      "template",
      "concept",
      "type-system",
      "const",
      "constexpr",
      "auto",
      "deduction",
      "overload",
    ],
    null,
  ),
  concept(
    "cpp-standards-idioms",
    "modern_cpp",
    "C++11–23 idioms",
    "Chọn đúng language feature, compatibility boundary và migration strategy.",
    ["cpp-lifetime-ownership", "cpp-types-templates"],
    [
      "cpp11",
      "cpp14",
      "cpp17",
      "cpp20",
      "cpp23",
      "modern-cpp",
      "lambda",
      "designated-initializer",
      "rule-of-zero",
      "special-member",
    ],
    null,
  ),
  concept(
    "algorithms-complexity",
    "algorithms_data_structures",
    "Complexity & trade-offs",
    "Time/space complexity, amortization và reasoning dưới workload thực.",
    [],
    ["complexity", "big-o", "amortized", "algorithm", "trade-off"],
    null,
  ),
  concept(
    "algorithms-containers",
    "algorithms_data_structures",
    "Containers & ordering",
    "Chọn layout, ordering, hashing và invalidation phù hợp.",
    ["algorithms-complexity"],
    [
      "container",
      "vector",
      "map",
      "unordered",
      "hash",
      "sort",
      "iterator",
      "invalidation",
      "data-structure",
    ],
    null,
  ),
  concept(
    "algorithms-streaming",
    "algorithms_data_structures",
    "Streaming algorithms",
    "Online aggregation, rolling window, bounded memory và deterministic output.",
    ["algorithms-complexity", "algorithms-containers"],
    [
      "streaming",
      "rolling",
      "window",
      "aggregation",
      "top-k",
      "online-algorithm",
      "interval-statistics",
    ],
    "/learn/tick-data-order-book",
  ),
  concept(
    "concurrency-memory-model",
    "concurrency_memory",
    "Memory model & atomics",
    "Data race, happens-before, memory order và visibility giữa threads.",
    ["cpp-lifetime-ownership"],
    [
      "memory-model",
      "atomic",
      "happens-before",
      "memory-order",
      "data-race",
      "lock-free",
    ],
    null,
  ),
  concept(
    "concurrency-synchronization",
    "concurrency_memory",
    "Synchronization & ownership",
    "Mutex, condition variable, thread ownership và shutdown an toàn.",
    ["concurrency-memory-model"],
    [
      "mutex",
      "condition-variable",
      "synchronization",
      "thread",
      "deadlock",
      "race",
      "shutdown",
    ],
    null,
  ),
  concept(
    "concurrency-backpressure",
    "concurrency_memory",
    "Queues & backpressure",
    "Bounded queues, contention, overload policy và deterministic partitioning.",
    ["concurrency-memory-model", "concurrency-synchronization"],
    [
      "queue",
      "backpressure",
      "contention",
      "partition",
      "producer",
      "consumer",
      "hot-key",
    ],
    null,
  ),
  concept(
    "performance-cache-allocation",
    "performance_latency",
    "Cache, layout & allocation",
    "Locality, false sharing, allocation policy và copy cost.",
    ["cpp-lifetime-ownership", "algorithms-containers"],
    [
      "cache",
      "allocation",
      "locality",
      "false-sharing",
      "layout",
      "copy",
      "zero-copy",
    ],
    null,
  ),
  concept(
    "performance-profiling",
    "performance_latency",
    "Profiling & benchmark",
    "Đo trước khi tối ưu, benchmark đúng và phân biệt CPU, I/O, allocation.",
    ["performance-cache-allocation"],
    [
      "profile",
      "profiling",
      "benchmark",
      "perf",
      "flamegraph",
      "measurement",
      "latency",
    ],
    null,
  ),
  concept(
    "performance-capacity",
    "performance_latency",
    "Throughput & tail latency",
    "Capacity model, p99, overload, batching và latency/throughput trade-off.",
    ["performance-profiling", "concurrency-backpressure"],
    [
      "throughput",
      "tail-latency",
      "p99",
      "capacity",
      "batch",
      "overload",
      "performance",
    ],
    null,
  ),
  concept(
    "linux-process-io",
    "linux_networking",
    "Linux process & I/O",
    "Process, file descriptor, virtual memory và blocking/non-blocking I/O.",
    [],
    [
      "linux",
      "unix",
      "process",
      "file-descriptor",
      "io",
      "epoll",
      "mmap",
      "syscall",
    ],
    null,
  ),
  concept(
    "linux-network-protocols",
    "linux_networking",
    "Sockets & protocols",
    "TCP/UDP semantics, framing, reconnect và failure handling.",
    ["linux-process-io"],
    [
      "socket",
      "tcp",
      "udp",
      "network",
      "protocol",
      "packet",
      "reconnect",
      "multicast",
    ],
    null,
  ),
  concept(
    "linux-observability",
    "linux_networking",
    "Production observability",
    "Logs, metrics, traces, incident triage và evidence-driven diagnosis.",
    ["linux-process-io", "performance-profiling"],
    [
      "observability",
      "incident",
      "metric",
      "log",
      "trace",
      "diagnostic",
      "production",
    ],
    null,
  ),
  concept(
    "distributed-partitioning",
    "distributed_data_platform",
    "Partitioning & replication",
    "Key ownership, replication, hot partitions và failure domains.",
    ["algorithms-containers"],
    [
      "partition",
      "replication",
      "shard",
      "hot-key",
      "failure-domain",
      "distributed",
    ],
    null,
  ),
  concept(
    "distributed-streaming",
    "distributed_data_platform",
    "Streaming & backpressure",
    "Ordering, delivery semantics, checkpoints và bounded flow control.",
    ["distributed-partitioning", "concurrency-backpressure"],
    [
      "stream",
      "streaming",
      "backpressure",
      "checkpoint",
      "delivery",
      "consumer",
      "offset",
    ],
    null,
  ),
  concept(
    "distributed-consistency",
    "distributed_data_platform",
    "Consistency & migration",
    "Idempotency, replay, parity, cutover và rollback qua nhiều datasets.",
    ["distributed-streaming"],
    [
      "consistency",
      "idempotency",
      "replay",
      "migration",
      "parity",
      "cutover",
      "rollback",
    ],
    "/learn/tick-data-order-book",
  ),
  concept(
    "tick-feed-integrity",
    "tick_market_data",
    "Feed integrity",
    "Sequence, duplicate, gap, snapshot và deterministic replay.",
    ["linux-network-protocols", "distributed-consistency"],
    [
      "tick-data",
      "feed",
      "sequence",
      "duplicate",
      "gap",
      "snapshot",
      "replay",
      "market-data",
    ],
    "/learn/tick-data-order-book",
  ),
  concept(
    "tick-order-book",
    "tick_market_data",
    "Order-book state",
    "L1/L2 updates, invariants, fixed-point price và resynchronization.",
    ["tick-feed-integrity", "algorithms-containers"],
    [
      "order-book",
      "book",
      "bid",
      "ask",
      "level",
      "fixed-point",
      "resync",
    ],
    "/learn/tick-data-order-book",
  ),
  concept(
    "tick-interval-features",
    "tick_market_data",
    "Interval features",
    "OHLCV, VWAP, missingness, precision và parity với legacy outputs.",
    ["tick-feed-integrity", "algorithms-streaming"],
    [
      "interval",
      "ohlcv",
      "vwap",
      "feature",
      "statistics",
      "precision",
      "volume",
      "turnover",
    ],
    "/learn/tick-data-order-book",
  ),
  concept(
    "build-target-cmake",
    "build_delivery",
    "Target-based CMake",
    "Target graph, usage requirements, transitive dependencies và portability.",
    [],
    [
      "cmake",
      "target",
      "usage-requirement",
      "target-link-libraries",
      "target-include-directories",
    ],
    "/learn/cmake",
  ),
  concept(
    "build-test-sanitizer",
    "build_delivery",
    "Testing & sanitizers",
    "CTest, unit/integration tests, ASan/UBSan/TSan và reproducibility.",
    ["build-target-cmake"],
    [
      "ctest",
      "testing",
      "test",
      "sanitizer",
      "asan",
      "ubsan",
      "tsan",
      "reproducible",
    ],
    "/learn/cmake",
  ),
  concept(
    "build-ci-release",
    "build_delivery",
    "CI/CD & release discipline",
    "Git workflow, CI gates, packaging, deployment, rollback và SDLC.",
    ["build-test-sanitizer"],
    [
      "ci",
      "ci-cd",
      "git",
      "release",
      "deploy",
      "packaging",
      "sdlc",
      "rollback",
    ],
    "/learn/cmake",
  ),
  concept(
    "scripting-python-data",
    "scripting_automation",
    "Python data tooling",
    "Streaming files, iterators, validation và bounded-memory automation.",
    [],
    [
      "python",
      "generator",
      "iterator",
      "streaming-data",
      "script",
      "automation",
    ],
    null,
  ),
  concept(
    "scripting-perl-legacy",
    "scripting_automation",
    "Perl & legacy automation",
    "Đọc, bảo trì và thay thế script legacy với testable boundaries.",
    [],
    ["perl", "legacy-script", "legacy", "automation", "migration-script"],
    null,
  ),
  concept(
    "scripting-reconciliation",
    "scripting_automation",
    "Reconciliation tooling",
    "Tolerance, mismatch reports, resume, audit trail và CI integration.",
    ["scripting-python-data", "distributed-consistency"],
    [
      "reconciliation",
      "tolerance",
      "mismatch",
      "audit",
      "resume",
      "parity",
      "backfill",
    ],
    null,
  ),
  concept(
    "ownership-requirements",
    "ownership_communication",
    "Requirements with researchers",
    "Làm rõ ambiguous behavior, acceptance criteria và stakeholder sign-off.",
    [],
    [
      "requirements",
      "researcher",
      "stakeholder",
      "acceptance",
      "ambiguity",
      "collaboration",
    ],
    null,
  ),
  concept(
    "ownership-incidents",
    "ownership_communication",
    "Incident & product ownership",
    "Investigation, risk communication, mitigation, follow-up và prevention.",
    ["ownership-requirements", "linux-observability"],
    [
      "incident",
      "ownership",
      "risk",
      "mitigation",
      "postmortem",
      "root-cause",
      "product-ownership",
    ],
    null,
  ),
  concept(
    "ownership-english",
    "ownership_communication",
    "English across time zones",
    "Trình bày technical decision rõ, concise và phối hợp bất đồng bộ.",
    ["ownership-requirements"],
    [
      "english",
      "cross-timezone",
      "communication",
      "async",
      "explain",
      "behavioral",
    ],
    null,
  ),
] as const;

const conceptsByCompetency = new Map<
  WorldQuantCompetencyKey,
  WorldQuantConcept[]
>();
for (const competency of worldQuantCompetencyKeys) {
  conceptsByCompetency.set(
    competency,
    worldQuantConcepts.filter(
      (conceptDefinition) =>
        conceptDefinition.competency === competency,
    ),
  );
}

export function conceptsForCompetency(
  competency: WorldQuantCompetencyKey,
): readonly WorldQuantConcept[] {
  return conceptsByCompetency.get(competency) ?? [];
}

export function classifyQuestionConcepts(
  question: CurriculumQuestionEvidence,
): WorldQuantConceptId[] {
  const directSignals = new Set(
    [...question.topics, ...question.tags].map(normalizeSignal),
  );
  const competencyConcepts = conceptsForCompetency(
    question.competency,
  );
  const directMatches = competencyConcepts
    .filter((conceptDefinition) =>
      conceptDefinition.signals.some((signal) =>
        matchesSignal(directSignals, normalizeSignal(signal)),
      ),
    )
    .map((conceptDefinition) => conceptDefinition.id);
  if (directMatches.length > 0) return directMatches;

  const lessonSignals = new Set([normalizeSignal(question.lessonId)]);
  return competencyConcepts
    .filter((conceptDefinition) =>
      conceptDefinition.signals.some((signal) =>
        matchesSignal(lessonSignals, normalizeSignal(signal)),
      ),
    )
    .map((conceptDefinition) => conceptDefinition.id);
}

export function buildWorldQuantCurriculumCoverage({
  questions,
  drills = [],
}: {
  questions: readonly CurriculumQuestionEvidence[];
  drills?: readonly CurriculumDrillEvidence[];
}): WorldQuantCurriculumCoverage {
  const questionConcepts = new Map<string, WorldQuantConceptId[]>();
  const unclassifiedQuestionIds: string[] = [];
  for (const question of questions) {
    const matched = classifyQuestionConcepts(question);
    questionConcepts.set(question.id, matched);
    if (matched.length === 0) unclassifiedQuestionIds.push(question.id);
  }

  const concepts = worldQuantConcepts.map((conceptDefinition) => {
    const relatedQuestions = questions.filter((question) =>
      questionConcepts.get(question.id)?.includes(conceptDefinition.id),
    );
    const relatedDrills = drills.filter((drill) =>
      drill.conceptIds.includes(conceptDefinition.id),
    );
    const activeQuestionIds = uniqueSorted(
      relatedQuestions
        .filter((question) =>
          [
            "repository_verified",
            "owner_approved",
          ].includes(question.evidenceKind),
        )
        .map((question) => question.id),
    );
    const pendingQuestionIds = uniqueSorted(
      relatedQuestions
        .filter((question) => question.evidenceKind === "pending_review")
        .map((question) => question.id),
    );
    const personalRemediationIds = uniqueSorted(
      relatedQuestions
        .filter(
          (question) =>
            question.evidenceKind === "personal_remediation",
        )
        .map((question) => question.id),
    );
    const practiceDrillIds = uniqueSorted(
      relatedDrills
        .filter((drill) => drill.variant === "practice")
        .map((drill) => drill.id),
    );
    const checkpointDrillIds = uniqueSorted(
      relatedDrills
        .filter((drill) => drill.variant === "checkpoint")
        .map((drill) => drill.id),
    );

    return {
      concept: conceptDefinition,
      status: coverageStatus({
        activeQuestionIds,
        pendingQuestionIds,
        practiceDrillIds,
        checkpointDrillIds,
      }),
      activeQuestionIds,
      pendingQuestionIds,
      personalRemediationIds,
      practiceDrillIds,
      checkpointDrillIds,
    };
  });

  const competencies = Object.fromEntries(
    worldQuantCompetencyKeys.map((competency) => {
      const competencyConcepts = concepts.filter(
        (item) => item.concept.competency === competency,
      );
      return [
        competency,
        {
          competency,
          conceptCount: competencyConcepts.length,
          coveredConceptCount: competencyConcepts.filter(
            (item) => item.activeQuestionIds.length > 0,
          ).length,
          transferReadyConceptCount: competencyConcepts.filter(
            (item) => item.status === "transfer_ready",
          ).length,
          activeQuestionCount: uniqueSorted(
            competencyConcepts.flatMap(
              (item) => item.activeQuestionIds,
            ),
          ).length,
          pendingQuestionCount: uniqueSorted(
            competencyConcepts.flatMap(
              (item) => item.pendingQuestionIds,
            ),
          ).length,
          practiceDrillCount: uniqueSorted(
            competencyConcepts.flatMap(
              (item) => item.practiceDrillIds,
            ),
          ).length,
          checkpointDrillCount: uniqueSorted(
            competencyConcepts.flatMap(
              (item) => item.checkpointDrillIds,
            ),
          ).length,
        },
      ];
    }),
  ) as Record<WorldQuantCompetencyKey, CurriculumCompetencyCoverage>;

  return {
    version: WORLDQUANT_CURRICULUM_VERSION,
    concepts,
    competencies,
    unclassifiedQuestionIds: uniqueSorted(unclassifiedQuestionIds),
  };
}

function concept(
  id: WorldQuantConceptId,
  competency: WorldQuantCompetencyKey,
  label: string,
  summary: string,
  prerequisites: readonly WorldQuantConceptId[],
  signals: readonly string[],
  guideHref: string | null,
): WorldQuantConcept {
  return {
    id,
    competency,
    label,
    summary,
    prerequisites,
    signals,
    guideHref,
  };
}

function matchesSignal(haystack: Set<string>, signal: string) {
  for (const value of haystack) {
    if (
      value === signal ||
      value.startsWith(`${signal}-`) ||
      value.endsWith(`-${signal}`) ||
      value.includes(`-${signal}-`)
    ) {
      return true;
    }
  }
  return false;
}

function normalizeSignal(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll("::", "-");
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function coverageStatus({
  activeQuestionIds,
  pendingQuestionIds,
  practiceDrillIds,
  checkpointDrillIds,
}: Pick<
  CurriculumConceptCoverage,
  | "activeQuestionIds"
  | "pendingQuestionIds"
  | "practiceDrillIds"
  | "checkpointDrillIds"
>): CurriculumConceptCoverageStatus {
  if (
    activeQuestionIds.length > 0 &&
    practiceDrillIds.length > 0 &&
    checkpointDrillIds.length > 0
  ) {
    return "transfer_ready";
  }
  if (activeQuestionIds.length > 0) return "flashcard_only";
  if (pendingQuestionIds.length > 0) return "pending_review";
  if (
    practiceDrillIds.length > 0 ||
    checkpointDrillIds.length > 0
  ) {
    return "drill_only";
  }
  return "content_gap";
}
