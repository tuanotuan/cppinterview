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

const allWorldQuantConcepts: readonly WorldQuantConcept[] = [
  concept(
    "cpp-lifetime-ownership",
    "modern_cpp",
    "Vòng đời và quyền sở hữu",
    "RAII, ngữ nghĩa giá trị, tham chiếu, đối tượng xem (view) và vòng đời tài nguyên trên luồng xử lý cần hiệu năng cao (hot path).",
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
    "Hệ thống kiểu và mẫu",
    "Tính đúng đắn của const, suy luận kiểu, concept, mẫu (template), mã tổng quát và ràng buộc tại thời điểm biên dịch.",
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
    "Cách viết C++11–23 hiện đại",
    "Chọn đúng tính năng ngôn ngữ, ranh giới tương thích và chiến lược nâng cấp.",
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
    "Độ phức tạp và đánh đổi",
    "Độ phức tạp thời gian/bộ nhớ, chi phí trung bình và lập luận theo tải thực tế.",
    [],
    ["complexity", "big-o", "amortized", "algorithm", "trade-off"],
    null,
  ),
  concept(
    "algorithms-containers",
    "algorithms_data_structures",
    "Cấu trúc chứa và thứ tự dữ liệu",
    "Chọn cách bố trí, thứ tự, hàm băm và quy tắc mất hiệu lực phù hợp.",
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
    "Thuật toán xử lý luồng",
    "Tổng hợp trực tuyến, cửa sổ trượt, bộ nhớ có giới hạn và đầu ra xác định.",
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
    "Mô hình bộ nhớ và thao tác nguyên tử",
    "Tranh chấp dữ liệu, quan hệ thứ tự giữa thao tác (happens-before), thứ tự bộ nhớ và khả năng nhìn thấy dữ liệu giữa các luồng.",
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
    "Đồng bộ và quyền sở hữu",
    "Mutex, biến điều kiện, quyền sở hữu luồng và dừng hệ thống an toàn.",
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
    "Hàng đợi và kiểm soát quá tải",
    "Hàng đợi có giới hạn, tranh chấp tài nguyên, chính sách quá tải và phân vùng xác định.",
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
    "Bộ nhớ đệm, bố trí và cấp phát",
    "Tính cục bộ, chia sẻ giả (false sharing), chính sách cấp phát và chi phí sao chép.",
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
    "Phân tích và đo hiệu năng",
    "Đo trước khi tối ưu, xây phép đo đúng và phân biệt chi phí CPU, I/O, cấp phát.",
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
    "Thông lượng và độ trễ đuôi",
    "Mô hình năng lực xử lý, p99, quá tải, xử lý theo lô và đánh đổi giữa độ trễ với thông lượng.",
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
    "Tiến trình Linux và I/O",
    "Tiến trình, bộ mô tả tệp (file descriptor), bộ nhớ ảo và I/O chặn hoặc không chặn.",
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
    "Socket và giao thức",
    "Ngữ nghĩa TCP/UDP, phân khung thông điệp, kết nối lại và xử lý lỗi.",
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
    "Khả năng quan sát hệ thống thực tế",
    "Nhật ký, số liệu, dấu vết, phân loại sự cố và chẩn đoán dựa trên bằng chứng.",
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
    "Phân vùng và sao chép",
    "Quyền sở hữu khóa, sao chép, phân vùng quá tải và miền sự cố.",
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
    "Xử lý luồng và kiểm soát quá tải",
    "Thứ tự, bảo đảm giao nhận thông điệp, điểm kiểm tra và kiểm soát luồng có giới hạn.",
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
    "Tính nhất quán và chuyển đổi hệ thống",
    "Tính lặp an toàn, phát lại, đối chiếu tương đương, chuyển đổi chính thức và quay lui trên nhiều tập dữ liệu.",
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
    "Tính toàn vẹn nguồn dữ liệu",
    "Số thứ tự, dữ liệu trùng, khoảng thiếu, ảnh chụp trạng thái (snapshot) và phát lại xác định.",
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
    "Trạng thái sổ lệnh",
    "Cập nhật L1/L2, bất biến, giá biểu diễn bằng số nguyên có hệ số (fixed-point) và đồng bộ lại.",
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
    "Đặc trưng theo khoảng thời gian",
    "OHLCV, VWAP, dữ liệu thiếu, độ chính xác và tính tương đương với đầu ra hệ thống cũ.",
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
    "CMake theo target",
    "Đồ thị target, yêu cầu sử dụng, phụ thuộc bắc cầu và khả năng chạy trên nhiều nền tảng.",
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
    "Kiểm thử và công cụ phát hiện lỗi",
    "CTest, kiểm thử đơn vị/tích hợp, ASan/UBSan/TSan và khả năng tái lập.",
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
    "CI/CD và quy trình phát hành",
    "Quy trình Git, cổng kiểm tra CI, đóng gói, triển khai, quay lui và SDLC.",
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
    "Công cụ dữ liệu bằng Python",
    "Xử lý tệp theo luồng, bộ lặp (iterator), kiểm tra hợp lệ và tự động hóa với bộ nhớ có giới hạn.",
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
    "Perl và tự động hóa hệ thống cũ",
    "Đọc, bảo trì và thay thế tập lệnh cũ với các ranh giới có thể kiểm thử.",
    [],
    ["perl", "legacy-script", "legacy", "automation", "migration-script"],
    null,
  ),
  concept(
    "scripting-reconciliation",
    "scripting_automation",
    "Công cụ đối soát",
    "Ngưỡng sai số, báo cáo chênh lệch, tiếp tục tác vụ, lịch sử kiểm toán và tích hợp CI.",
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
    "Làm rõ yêu cầu với nhà nghiên cứu",
    "Làm rõ hành vi còn mơ hồ, tiêu chí chấp nhận và xác nhận của bên liên quan.",
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
    "Xử lý sự cố và làm chủ sản phẩm",
    "Điều tra, trao đổi rủi ro, giảm thiểu tác động, theo dõi và phòng ngừa.",
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
    "Tiếng Anh khi làm việc khác múi giờ",
    "Trình bày quyết định kỹ thuật rõ ràng, súc tích và phối hợp bất đồng bộ.",
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

const cppOnlyConceptPresentation: Partial<
  Record<WorldQuantConceptId, Pick<WorldQuantConcept, "label" | "summary">>
> = {
  "build-target-cmake": {
    label: "Biên dịch C++ có thể tái lập",
    summary:
      "Chuẩn hóa compiler, warning và dependency để bản dựng C++ tái lập được trên máy phát triển và CI.",
  },
  "build-test-sanitizer": {
    label: "Kiểm thử và sanitizer C++",
    summary:
      "Dùng unit test, golden replay, AddressSanitizer và UndefinedBehaviorSanitizer để bắt lỗi trước production.",
  },
  "build-ci-release": {
    label: "Phát hành C++ an toàn",
    summary:
      "Thiết kế cổng CI, benchmark baseline và rollback evidence cho thay đổi ở hệ thống C++.",
  },
  "scripting-python-data": {
    label: "Công cụ dữ liệu bằng C++",
    summary:
      "Xử lý dữ liệu lớn theo luồng bằng C++ với giới hạn bộ nhớ, đầu ra xác định và khả năng tái chạy.",
  },
  "scripting-perl-legacy": {
    label: "Kiểm toán pipeline C++ legacy",
    summary:
      "Hiểu hành vi legacy, viết characterization test và thay thế an toàn bằng thành phần C++ có kiểm soát.",
  },
  "scripting-reconciliation": {
    label: "Đối soát dữ liệu bằng C++",
    summary:
      "Thiết kế đối soát dữ liệu theo luồng, có checkpoint, audit trail và ngưỡng sai số rõ ràng.",
  },
};

export const worldQuantConcepts: readonly WorldQuantConcept[] =
  allWorldQuantConcepts.map((concept) => {
    const presentation = cppOnlyConceptPresentation[concept.id];
    return presentation
      ? { ...concept, ...presentation, guideHref: null }
      : concept;
  });

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
