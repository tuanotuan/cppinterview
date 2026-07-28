import type { CurriculumDrillEvidence, WorldQuantConceptId } from "./curriculum";
import {
  worldQuantCompetencyKeys,
  type WorldQuantCompetencyKey,
} from "./readiness";

export const WORLDQUANT_DRILL_CATALOG_VERSION = 1 as const;

export type WorldQuantDrillKind =
  | "explain"
  | "diagnose"
  | "implement"
  | "design"
  | "incident";

export type WorldQuantDrill = {
  id: string;
  version: 1;
  variant: "practice" | "checkpoint";
  competency: WorldQuantCompetencyKey;
  conceptIds: readonly WorldQuantConceptId[];
  title: string;
  kind: WorldQuantDrillKind;
  language: "cpp" | "cmake" | "python" | "shell" | "english";
  estimatedMinutes: number;
  prompt: string;
  starterCode: string | null;
  followUps: readonly [
    { id: string; prompt: string },
    { id: string; prompt: string },
  ];
  rubric: readonly string[];
  sourceLabel: string;
  sourceHref: string;
};

export type WorldQuantDrillPack = {
  id: string;
  version: 1;
  competency: WorldQuantCompetencyKey;
  title: string;
  summary: string;
  practice: WorldQuantDrill;
  checkpoint: WorldQuantDrill;
  checkpointRetry: WorldQuantDrill;
};

export const worldQuantDrillPacks: readonly WorldQuantDrillPack[] = [
  pack({
    id: "modern-cpp-lifetime",
    competency: "modern_cpp",
    title: "Modern C++ ownership under load",
    summary:
      "Luyện lifetime, API contracts và zero-copy mà không tạo dangling view.",
    conceptIds: [
      "cpp-lifetime-ownership",
      "cpp-types-templates",
      "cpp-standards-idioms",
    ],
    sourceLabel: "C++ lesson bank",
    sourceHref: "/?deck=cpp-interview",
    practice: {
      title: "Repair a dangling market event",
      kind: "implement",
      language: "cpp",
      estimatedMinutes: 16,
      prompt:
        "API decode trả string_view và span trỏ vào packet được truyền by value. Hãy sửa contract để lifetime rõ ràng, hạn chế copy trên hot path và giải thích invariant mà caller phải giữ.",
      starterCode: `struct EventView {
  std::string_view symbol;
  std::span<const std::byte> payload;
};

EventView decode(std::vector<std::byte> packet);`,
      followUps: [
        "Thiết kế thay đổi thế nào nếu event phải sống lâu hơn receive buffer?",
        "Mày sẽ test và instrument lỗi lifetime này trong production ra sao?",
      ],
      rubric: [
        "Chỉ ra chính xác owner bị hủy khi decode trả về.",
        "Contract biểu diễn owner hoặc lifetime dependency rõ ràng.",
        "Nêu được trade-off owning result và borrowed view.",
        "Có test boundary hoặc sanitizer phù hợp.",
      ],
    },
    checkpoint: {
      title: "Defend a zero-copy feed API",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Thiết kế API C++20 cho decoder nhận ring-buffer slots tái sử dụng. Consumer có thể xử lý đồng bộ hoặc chuyển việc sang worker. Hãy trình bày types, ownership, backpressure và điều kiện zero-copy còn an toàn.",
      starterCode: null,
      followUps: [
        "Nếu worker chậm hơn producer thì API phải phản ứng thế nào?",
        "Nếu nâng codebase từ C++11 lên C++20, mày rollout contract mới ra sao?",
      ],
      rubric: [
        "Phân biệt lifetime synchronous và asynchronous.",
        "Không giữ view sau khi slot được reuse nếu thiếu ownership token.",
        "Có bounded backpressure hoặc copy fallback rõ ràng.",
        "Nêu migration và compatibility strategy.",
      ],
    },
    checkpointRetry: {
      title: "Design a move-only batch handoff",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "A C++20 parser builds EventBatch objects in a reusable std::pmr arena, then hands them to workers that may queue work beyond the current receive cycle. Design the public types and handoff protocol so ownership, allocator lifetime and cancellation are explicit without forcing one allocation per event.",
      starterCode: null,
      followUps: [
        "How would the contract change for a synchronous observer that never retains an event?",
        "Which compile-time and runtime tests would catch accidental copies or arena reuse?",
      ],
      rubric: [
        "Separates owning batch state from non-owning event views.",
        "Makes allocator and arena lifetime survive every asynchronous consumer.",
        "Uses move-only or tokenized handoff with an explicit release point.",
        "Explains cancellation, backpressure and tests for reuse or copy regressions.",
      ],
    },
  }),
  pack({
    id: "algorithms-streaming",
    competency: "algorithms_data_structures",
    title: "Algorithms for market-data streams",
    summary:
      "Chọn cấu trúc dữ liệu và chứng minh complexity dưới streaming workload.",
    conceptIds: [
      "algorithms-complexity",
      "algorithms-containers",
      "algorithms-streaming",
    ],
    sourceLabel: "C++ question bank",
    sourceHref: "/?deck=cpp-interview",
    practice: {
      title: "Rolling top-of-book window",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 15,
      prompt:
        "Thiết kế cấu trúc giữ min, max và median spread trong cửa sổ 60 giây với tick đến theo timestamp. Nêu operations, complexity, memory bound và chính sách late data.",
      starterCode: null,
      followUps: [
        "Nếu throughput tăng 20 lần, bottleneck đầu tiên có thể nằm ở đâu?",
        "Khi nào mày chọn approximate quantile thay vì exact median?",
      ],
      rubric: [
        "Mô tả eviction theo thời gian rõ ràng.",
        "Chọn container phù hợp cho min/max và median.",
        "Phân tích time và space complexity.",
        "Có late/out-of-order policy deterministic.",
      ],
    },
    checkpoint: {
      title: "Bounded duplicate detector",
      kind: "implement",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Feed có sequence 64-bit, duplicate có thể xuất hiện trong 1 triệu message gần nhất. Thiết kế duplicate detector bounded-memory, giải thích wrap/reset và chứng minh không biến gap thành duplicate.",
      starterCode: `class DuplicateWindow {
public:
  bool seen_or_insert(std::uint64_t sequence);
  void reset(std::uint64_t snapshot_sequence);
};`,
      followUps: [
        "So sánh bitmap/ring với unordered_set cho workload này.",
        "Mày benchmark detector mà không benchmark nhầm allocator như thế nào?",
      ],
      rubric: [
        "State bị giới hạn theo window.",
        "Phân biệt duplicate, old data và forward gap.",
        "Reset/snapshot semantics rõ ràng.",
        "Complexity và cache behavior được giải thích.",
      ],
    },
    checkpointRetry: {
      title: "Rank hot symbols in one pass",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "A feed contains tens of millions of trades and the symbol universe is too large to keep every counter. Design a bounded-memory streaming algorithm that reports the likely top 100 symbols by notional every minute, including error bounds, deterministic tie-breaking and late corrections.",
      starterCode: null,
      followUps: [
        "When would an exact heap-and-map solution become preferable to a heavy-hitter sketch?",
        "How would you merge results from partitions without overstating accuracy?",
      ],
      rubric: [
        "Chooses an exact or approximate algorithm consistent with the stated memory bound.",
        "States update, query and merge complexity.",
        "Defines error guarantees and deterministic ranking semantics.",
        "Handles window rollover, late corrections and partition aggregation explicitly.",
      ],
    },
  }),
  pack({
    id: "concurrency-pipeline",
    competency: "concurrency_memory",
    title: "Concurrent feed pipeline",
    summary:
      "Reason về memory model, synchronization và overload thay vì chỉ chọn lock.",
    conceptIds: [
      "concurrency-memory-model",
      "concurrency-synchronization",
      "concurrency-backpressure",
    ],
    sourceLabel: "WorldQuant competency model",
    sourceHref: "/worldquant",
    practice: {
      title: "Diagnose a publication race",
      kind: "diagnose",
      language: "cpp",
      estimatedMinutes: 16,
      prompt:
        "Producer ghi payload rồi publish index; consumer đôi lúc thấy index mới nhưng payload cũ. Hãy chỉ ra data race/happens-before bị thiếu và đề xuất contract atomics hoặc synchronization tối thiểu.",
      starterCode: `payload[slot] = decoded;
published.store(slot, std::memory_order_relaxed);

auto slot = published.load(std::memory_order_relaxed);
consume(payload[slot]);`,
      followUps: [
        "Release/acquire ở đây bảo đảm điều gì và không bảo đảm điều gì?",
        "Nếu có nhiều producer, thiết kế phải đổi ở đâu?",
      ],
      rubric: [
        "Chỉ ra relaxed publication không tạo happens-before.",
        "Đề xuất release/acquire hoặc primitive mạnh hơn đúng chỗ.",
        "Xử lý slot reuse và ownership.",
        "Không tuyên bố atomics tự giải quyết multi-producer protocol.",
      ],
    },
    checkpoint: {
      title: "Design bounded fan-out",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Một normalized tick phải đến ba consumer có tốc độ khác nhau. Thiết kế fan-out bounded, shutdown an toàn và overload policy mà không để consumer chậm phá latency của tất cả.",
      starterCode: null,
      followUps: [
        "Mày đo contention và false sharing ở đâu?",
        "Khi drop dữ liệu, hệ thống chứng minh downstream state còn đúng bằng cách nào?",
      ],
      rubric: [
        "Nêu ownership của message giữa các consumer.",
        "Queue và capacity có bound rõ.",
        "Overload/drop/resync policy giữ correctness.",
        "Shutdown không race và có observability.",
      ],
    },
    checkpointRetry: {
      title: "Close an ingestion queue without lost work",
      kind: "diagnose",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "An MPSC ingestion queue occasionally hangs during shutdown: producers can still reserve slots while the consumer observes stop=true and exits. Diagnose the state-machine race and design a bounded close/drain protocol with clear memory-order and ownership guarantees.",
      starterCode: null,
      followUps: [
        "How do you prevent a producer that reserved but never published from blocking shutdown forever?",
        "Which stress or model-based tests would distinguish lost wakeups from memory-order bugs?",
      ],
      rubric: [
        "Identifies the race between reservation, publication and stop observation.",
        "Defines linearization points for close, publish and drain.",
        "Uses synchronization and memory order with a stated happens-before argument.",
        "Bounds shutdown and covers abandoned reservations, wakeups and observability.",
      ],
    },
  }),
  pack({
    id: "performance-latency",
    competency: "performance_latency",
    title: "Latency evidence, not folklore",
    summary:
      "Luyện measurement, cache/allocation và p99 capacity reasoning.",
    conceptIds: [
      "performance-cache-allocation",
      "performance-profiling",
      "performance-capacity",
    ],
    sourceLabel: "C++ performance lessons",
    sourceHref: "/?deck=cpp-interview",
    practice: {
      title: "Explain a p99 regression",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 15,
      prompt:
        "Sau release, median latency không đổi nhưng p99 tăng 4 lần khi market mở cửa. Hãy lập investigation tree, số liệu cần thu và experiment tách allocation, lock contention, I/O và batching.",
      starterCode: null,
      followUps: [
        "Làm sao tránh profiler làm thay đổi workload đang đo?",
        "Khi rollback chữa được triệu chứng, bước ownership tiếp theo là gì?",
      ],
      rubric: [
        "Phân biệt median và tail behavior.",
        "Đặt giả thuyết có experiment bác bỏ được.",
        "Dùng workload và baseline đại diện.",
        "Có mitigation, rollback và follow-up.",
      ],
    },
    checkpoint: {
      title: "Defend a batching change",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Đề xuất batching 32 ticks để tăng throughput. Hãy xây performance model, benchmark plan và release guardrail để chứng minh lợi ích không phá latency SLA hoặc data ordering.",
      starterCode: null,
      followUps: [
        "Batch size nên cố định hay adaptive theo queue depth?",
        "Những số liệu nào khiến mày hủy thay đổi dù throughput tăng?",
      ],
      rubric: [
        "Nêu throughput/latency trade-off định lượng.",
        "Giữ ordering và timestamp semantics.",
        "Benchmark có warm-up, distribution và realistic load.",
        "Có canary, threshold và rollback.",
      ],
    },
    checkpointRetry: {
      title: "Isolate a NUMA-sensitive latency spike",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "After moving a feed process to a larger dual-socket host, throughput improves but p99 latency spikes only when a worker is rescheduled across sockets. Build a measurement and remediation plan covering NUMA placement, cache locality, allocation and misleading benchmark effects.",
      starterCode: null,
      followUps: [
        "What evidence would separate remote-memory access from lock contention?",
        "How would you canary CPU pinning without hiding an underlying capacity problem?",
      ],
      rubric: [
        "Starts from per-thread latency, CPU placement and NUMA locality evidence.",
        "Controls workload, frequency, warm-up and profiler overhead.",
        "Separates allocation, migration, cache and synchronization hypotheses.",
        "Defines a reversible mitigation with capacity and regression guardrails.",
      ],
    },
  }),
  pack({
    id: "linux-network",
    competency: "linux_networking",
    title: "Linux and feed-network triage",
    summary:
      "Chẩn đoán I/O, sockets và production evidence từ triệu chứng thực tế.",
    conceptIds: [
      "linux-process-io",
      "linux-network-protocols",
      "linux-observability",
    ],
    sourceLabel: "WorldQuant systems track",
    sourceHref: "/worldquant",
    practice: {
      title: "Triage multicast packet loss",
      kind: "incident",
      language: "shell",
      estimatedMinutes: 16,
      prompt:
        "Một host market-data báo sequence gaps lúc burst; host khác cùng feed không lỗi. Trình bày lệnh/số liệu Linux kiểm tra NIC, kernel drop, socket buffer, CPU scheduling và application queue theo thứ tự.",
      starterCode: null,
      followUps: [
        "Phân biệt packet mất trước NIC, trong kernel và trong app bằng evidence nào?",
        "Tăng receive buffer có thể che hoặc tạo vấn đề gì?",
      ],
      rubric: [
        "Đi từ network/NIC đến kernel/socket rồi application.",
        "Nêu counters hoặc tools cụ thể.",
        "Không thay tuning trước khi có baseline.",
        "Có cách tái hiện và xác nhận fix.",
      ],
    },
    checkpoint: {
      title: "Non-blocking reconnect protocol",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Thiết kế client TCP non-blocking nhận snapshot và incremental updates. Bao gồm framing, partial read, timeout, reconnect, duplicate response và cách không publish state chưa đồng bộ.",
      starterCode: null,
      followUps: [
        "Edge-triggered epoll thay đổi read loop thế nào?",
        "Nếu snapshot lớn hơn memory budget thì xử lý ra sao?",
      ],
      rubric: [
        "Xử lý partial read/write và message framing.",
        "State machine reconnect có timeout/backoff.",
        "Snapshot/incremental boundary giữ consistency.",
        "Có metrics cho disconnect, lag và parse failure.",
      ],
    },
    checkpointRetry: {
      title: "Diagnose an epoll busy loop",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "A non-blocking feed process suddenly consumes one full core while ingest traffic is near zero. Logs show repeated epoll wakeups on connections that were recently closed and file descriptors are being reused. Diagnose the likely lifecycle bug and propose a safe event-loop contract.",
      starterCode: null,
      followUps: [
        "How do edge-triggered and level-triggered semantics change the investigation?",
        "Which kernel and application observations prove the fix under reconnect churn?",
      ],
      rubric: [
        "Checks readiness flags, drain loops, close ordering and descriptor reuse.",
        "Associates events with connection generations instead of a bare file descriptor.",
        "Handles EAGAIN, errors, half-close and deregistration explicitly.",
        "Provides reproducible churn tests plus CPU, wakeup and stale-event metrics.",
      ],
    },
  }),
  pack({
    id: "distributed-data",
    competency: "distributed_data_platform",
    title: "Distributed tick-data platform",
    summary:
      "Partition, stream và migrate dữ liệu với idempotency cùng parity.",
    conceptIds: [
      "distributed-partitioning",
      "distributed-streaming",
      "distributed-consistency",
    ],
    sourceLabel: "Tick-data guide",
    sourceHref: "/learn/tick-data-order-book",
    practice: {
      title: "Recover a hot partition",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 17,
      prompt:
        "Pipeline partition theo symbol nhưng một symbol chiếm 35% traffic. Hãy thiết kế mitigation giữ ordering per instrument, bounded state và replay được khi rebalance.",
      starterCode: null,
      followUps: [
        "Nếu tách một symbol qua nhiều workers thì invariant nào bị phá?",
        "Checkpoint và offset phải commit theo thứ tự nào?",
      ],
      rubric: [
        "Giữ ordering key rõ ràng.",
        "Nêu trade-off repartition, isolate và scale-up.",
        "Checkpoint/offset/state transition idempotent.",
        "Có rollback hoặc replay plan.",
      ],
    },
    checkpoint: {
      title: "Exactly-once is a claim to prove",
      kind: "diagnose",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Team nói interval output là exactly-once vì consumer commit offset sau khi ghi DB. Phân tích failure windows, duplicate/missing outcomes và thiết kế idempotent contract thực tế.",
      starterCode: null,
      followUps: [
        "Dedupe key và retention window được chọn thế nào?",
        "Backfill chạy song song live stream cần namespace/version ra sao?",
      ],
      rubric: [
        "Liệt kê crash trước/sau write và trước/sau commit.",
        "Không dùng exactly-once như khẩu hiệu.",
        "Có idempotency key hoặc transactional boundary.",
        "Backfill/live coexistence và audit rõ.",
      ],
    },
    checkpointRetry: {
      title: "Join a backfill to the live stream",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 19,
      prompt:
        "A year-long tick backfill must populate a new feature store while live ingestion continues. Design partition ownership, watermarks and the handoff from historical to live processing so every key has an auditable, deterministic result without pausing production.",
      starterCode: null,
      followUps: [
        "How do you recover if a partition fails after publishing output but before its handoff marker?",
        "What changes when corrections can arrive for dates already declared complete?",
      ],
      rubric: [
        "Defines per-key ordering and an explicit historical/live boundary.",
        "Uses idempotent output identity and restartable checkpoints.",
        "Prevents concurrent writers from silently owning the same range.",
        "Covers corrections, audit lineage, validation and rollback.",
      ],
    },
  }),
  pack({
    id: "tick-market-data",
    competency: "tick_market_data",
    title: "Tick and order-book correctness",
    summary:
      "Feed integrity, book state và interval features đi qua replay deterministic.",
    conceptIds: [
      "tick-feed-integrity",
      "tick-order-book",
      "tick-interval-features",
    ],
    sourceLabel: "Tick data & order-book guide",
    sourceHref: "/learn/tick-data-order-book",
    practice: {
      title: "Repair an L2 book update path",
      kind: "implement",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Hoàn thiện apply cho L2 book: reject gap, ignore duplicate, quantity=0 xóa level và giữ best bid < best ask. Giải thích khi nào phải invalidate book và xin snapshot.",
      starterCode: `bool OrderBook::apply(const LevelUpdate& update) {
  // TODO: sequence, insert/update/delete and invariants.
}`,
      followUps: [
        "Crossed book có luôn là lỗi local không?",
        "Mày replay fixture nào để chứng minh state deterministic?",
      ],
      rubric: [
        "Sequence transition phân biệt duplicate và gap.",
        "Insert/update/delete đúng theo side.",
        "Invariant book được kiểm tra mà không che feed event hợp lệ.",
        "Có resync và deterministic replay.",
      ],
    },
    checkpoint: {
      title: "Migrate interval features without alpha drift",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Legacy và platform mới lệch VWAP ở 0.02% intervals. Hãy điều tra semantics, precision, missing data và event ordering; sau đó thiết kế parity gate, cutover và rollback.",
      starterCode: null,
      followUps: [
        "Tolerance nào là kỹ thuật, tolerance nào cần researcher sign-off?",
        "Nếu legacy có bug mà signals phụ thuộc bug đó thì xử lý thế nào?",
      ],
      rubric: [
        "So sánh input identity trước output.",
        "Kiểm tra ordering, boundary, missingness và precision.",
        "Tolerance có owner và rationale.",
        "Cutover/rollback bảo vệ researchers.",
      ],
    },
    checkpointRetry: {
      title: "Recover an order book after channel failover",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Primary and backup market-data channels overlap during failover. The backup starts from an older sequence, a later snapshot has a different book epoch, and several trades arrive between snapshot request and response. Design the reconciliation state machine before the book is republished.",
      starterCode: null,
      followUps: [
        "Which identifiers let you distinguish a duplicate packet from a new feed epoch?",
        "How would deterministic replay prove that no stale book escaped during failover?",
      ],
      rubric: [
        "Separates channel sequence, snapshot epoch and instrument state.",
        "Buffers or rejects incrementals around the snapshot boundary deterministically.",
        "Publishes only after continuity and book invariants are re-established.",
        "Includes bounded buffering, timeout, replay evidence and resync metrics.",
      ],
    },
  }),
  pack({
    id: "build-delivery",
    competency: "build_delivery",
    title: "CMake, tests and delivery",
    summary:
      "Target graph tới sanitizer, CI gate và rollback có thể lặp lại.",
    conceptIds: [
      "build-target-cmake",
      "build-test-sanitizer",
      "build-ci-release",
    ],
    sourceLabel: "CMake learning guide",
    sourceHref: "/learn/cmake",
    practice: {
      title: "Build a target-based test graph",
      kind: "implement",
      language: "cmake",
      estimatedMinutes: 18,
      prompt:
        "Viết CMakeLists tạo library feed_decoder, test executable, usage requirements đúng scope, C++20 và CTest. Không dùng global include_directories hay CXX_FLAGS.",
      starterCode: `cmake_minimum_required(VERSION 3.25)
project(feed LANGUAGES CXX)

# TODO`,
      followUps: [
        "Thêm ASan/UBSan opt-in mà không leak flags sang consumers thế nào?",
        "Package/install interface khác build interface ở đâu?",
      ],
      rubric: [
        "Library và test là target riêng.",
        "Include/link scope PUBLIC/PRIVATE hợp lý.",
        "C++ standard là target property.",
        "CTest và sanitizer option không dùng global flags.",
      ],
    },
    checkpoint: {
      title: "Design a reproducible migration pipeline",
      kind: "design",
      language: "cmake",
      estimatedMinutes: 18,
      prompt:
        "Legacy build dùng shell scripts và machine-local paths. Thiết kế migration sang CMake/Ninja với dependency pinning, CI matrix, artifact provenance và rollback mà vẫn ship đều.",
      starterCode: null,
      followUps: [
        "Mày chứng minh old/new binaries tương đương ở mức nào?",
        "Khi compiler upgrade đổi floating-point output, gate xử lý ra sao?",
      ],
      rubric: [
        "Migration incremental có compatibility boundary.",
        "Dependency/toolchain được pin và trace.",
        "CI kiểm tra build, test, sanitizer và artifact.",
        "Có parity evidence và rollback.",
      ],
    },
    checkpointRetry: {
      title: "Make generated headers hermetic",
      kind: "implement",
      language: "cmake",
      estimatedMinutes: 18,
      prompt:
        "A schema compiler generates C++ headers, but parallel Ninja builds intermittently compile stale files and installed packages expose build-tree paths. Design the target-based CMake graph for generation, consumption, testing and install/export without configure-time shell side effects.",
      starterCode: `add_custom_command(
  OUTPUT "\${CMAKE_CURRENT_BINARY_DIR}/generated/feed_schema.hpp"
  # TODO: command, dependencies and byproducts
)`,
      followUps: [
        "How do depfiles or BYPRODUCTS affect incremental correctness across generators?",
        "How would consumers find the generated header after installation?",
      ],
      rubric: [
        "Models generated outputs and all schema/tool dependencies explicitly.",
        "Connects generation to consuming targets without a global ordering hack.",
        "Separates build-tree and install-tree include interfaces.",
        "Tests clean, incremental, parallel and packaged builds reproducibly.",
      ],
    },
  }),
  pack({
    id: "scripting-reconciliation",
    competency: "scripting_automation",
    title: "Python, Perl and reconciliation",
    summary:
      "Automation bounded-memory, resume được và thay legacy script an toàn.",
    conceptIds: [
      "scripting-python-data",
      "scripting-perl-legacy",
      "scripting-reconciliation",
    ],
    sourceLabel: "Python lesson bank",
    sourceHref: "/?deck=python-interview",
    practice: {
      title: "Stream a parity report",
      kind: "implement",
      language: "python",
      estimatedMinutes: 17,
      prompt:
        "Thiết kế Python tool so sánh hai file interval đã sort theo key, không load toàn bộ vào RAM. Report mismatch có tolerance theo field, resume token và exit code dùng được trong CI.",
      starterCode: `def compare_streams(legacy_path, modern_path, policy):
    # TODO: bounded-memory merge and report
    pass`,
      followUps: [
        "Nếu một bên thiếu key, cursor của hai stream tiến thế nào?",
        "Mày test NaN, signed zero và timestamp boundary ra sao?",
      ],
      rubric: [
        "Dùng streaming merge bounded-memory.",
        "Phân biệt missing row và field mismatch.",
        "Tolerance policy explicit và versioned.",
        "Resume/audit/CI exit semantics rõ.",
      ],
    },
    checkpoint: {
      title: "Retire a fragile Perl backfill",
      kind: "design",
      language: "python",
      estimatedMinutes: 18,
      prompt:
        "Một Perl script không test đang backfill datasets production. Lập kế hoạch hiểu behavior, characterization tests, Python replacement, dual-run và cutover không mất audit history.",
      starterCode: null,
      followUps: [
        "Behavior nào phải giữ dù code nhìn có vẻ sai?",
        "Nếu dual-run quá đắt, mày chọn sample và risk gate thế nào?",
      ],
      rubric: [
        "Characterize behavior trước rewrite.",
        "Golden fixtures và edge cases có nguồn.",
        "Dual-run/sample strategy định lượng risk.",
        "Cutover, rollback và audit ownership rõ.",
      ],
    },
    checkpointRetry: {
      title: "Build a crash-safe resumable transform",
      kind: "implement",
      language: "python",
      estimatedMinutes: 18,
      prompt:
        "A Python migration rewrites thousands of compressed daily files to a new schema and may be killed at any point. Design bounded-memory processing, atomic publication, resumable checkpoints and an audit manifest so retries cannot mix partial and complete outputs.",
      starterCode: `def migrate_file(source, destination, checkpoint_store):
    # TODO: stream, validate and publish atomically
    pass`,
      followUps: [
        "How do you resume safely when the process dies after rename but before checkpoint commit?",
        "How would you parallelize by date without two workers publishing the same output?",
      ],
      rubric: [
        "Streams records without loading an entire day into memory.",
        "Uses temporary output, validation and atomic publication.",
        "Makes checkpoints and output identity idempotent across every crash window.",
        "Defines worker ownership, audit metadata, failure reporting and cleanup.",
      ],
    },
  }),
  pack({
    id: "ownership-communication",
    competency: "ownership_communication",
    title: "Ownership with researchers",
    summary:
      "Làm rõ yêu cầu, điều tra incident và giao tiếp English qua time zones.",
    conceptIds: [
      "ownership-requirements",
      "ownership-incidents",
      "ownership-english",
    ],
    sourceLabel: "WorldQuant JD competency",
    sourceHref: "/worldquant",
    practice: {
      title: "Resolve an ambiguous feature change",
      kind: "incident",
      language: "english",
      estimatedMinutes: 14,
      prompt:
        "Answer in English. A researcher says one signal changed after migration but cannot define the expected value. Explain how you investigate, communicate immediate risk, agree on semantics and own the resolution.",
      starterCode: null,
      followUps: [
        "What do you do if the original owner will not be online for eight hours?",
        "How do you prevent the same ambiguity from returning?",
      ],
      rubric: [
        "Separates observed facts from hypotheses.",
        "Protects downstream users while investigating.",
        "Defines an owner and acceptance evidence.",
        "Communicates concise updates and follow-up actions.",
      ],
    },
    checkpoint: {
      title: "Defend a risky cutover in English",
      kind: "design",
      language: "english",
      estimatedMinutes: 16,
      prompt:
        "Answer in English. Portfolio Management wants an early cutover while parity still has unexplained mismatches. Present your recommendation, evidence, options and escalation path without hiding uncertainty.",
      starterCode: null,
      followUps: [
        "The stakeholder accepts the risk verbally. What must happen next?",
        "How would you change your recommendation if rollback takes six hours?",
      ],
      rubric: [
        "States decision, evidence and uncertainty clearly.",
        "Offers bounded alternatives instead of a vague refusal.",
        "Makes risk acceptance and ownership explicit.",
        "Includes rollback cost and written follow-up.",
      ],
    },
    checkpointRetry: {
      title: "Lead a cross-time-zone incident handoff",
      kind: "incident",
      language: "english",
      estimatedMinutes: 16,
      prompt:
        "Answer in English. A pricing-data incident is still unresolved when your region signs off. Deliver a handoff that lets the next team act safely: state impact, evidence, uncertainty, decisions, rollback conditions and the ownership you retain.",
      starterCode: null,
      followUps: [
        "What do you say when the next team challenges an assumption you cannot verify immediately?",
        "How do you close the incident so temporary mitigations do not become permanent?",
      ],
      rubric: [
        "Communicates impact, timeline and current system state concisely.",
        "Separates confirmed evidence, hypotheses and unknowns.",
        "Assigns explicit actions, escalation thresholds and decision ownership.",
        "Retains follow-through for validation, documentation and permanent remediation.",
      ],
    },
  }),
] as const;

export const worldQuantDrills: readonly WorldQuantDrill[] =
  worldQuantDrillPacks.flatMap((drillPack) => [
    drillPack.practice,
    drillPack.checkpoint,
    drillPack.checkpointRetry,
  ]);

const drillsById = new Map(
  worldQuantDrills.map((drill) => [drill.id, drill]),
);

export function worldQuantDrillById(id: string) {
  return drillsById.get(id) ?? null;
}

export function drillsForCompetency(
  competency: WorldQuantCompetencyKey,
) {
  return worldQuantDrills.filter(
    (drill) => drill.competency === competency,
  );
}

export function curriculumDrillEvidence(): CurriculumDrillEvidence[] {
  return worldQuantDrills.map((drill) => ({
    id: drill.id,
    conceptIds: drill.conceptIds,
    variant: drill.variant,
  }));
}

function pack(input: {
  id: string;
  competency: WorldQuantCompetencyKey;
  title: string;
  summary: string;
  conceptIds: readonly WorldQuantConceptId[];
  sourceLabel: string;
  sourceHref: string;
  practice: DrillDefinition;
  checkpoint: DrillDefinition;
  checkpointRetry: DrillDefinition;
}): WorldQuantDrillPack {
  return {
    id: input.id,
    version: 1,
    competency: input.competency,
    title: input.title,
    summary: input.summary,
    practice: drill(
      `${input.id}-practice`,
      "practice",
      input.competency,
      input.conceptIds,
      input.sourceLabel,
      input.sourceHref,
      input.practice,
    ),
    checkpoint: drill(
      `${input.id}-checkpoint`,
      "checkpoint",
      input.competency,
      input.conceptIds,
      input.sourceLabel,
      input.sourceHref,
      input.checkpoint,
    ),
    checkpointRetry: drill(
      `${input.id}-checkpoint-retry`,
      "checkpoint",
      input.competency,
      input.conceptIds,
      input.sourceLabel,
      input.sourceHref,
      input.checkpointRetry,
    ),
  };
}

type DrillDefinition = {
  title: string;
  kind: WorldQuantDrillKind;
  language: WorldQuantDrill["language"];
  estimatedMinutes: number;
  prompt: string;
  starterCode: string | null;
  followUps: readonly [string, string];
  rubric: readonly string[];
};

function drill(
  id: string,
  variant: WorldQuantDrill["variant"],
  competency: WorldQuantCompetencyKey,
  conceptIds: readonly WorldQuantConceptId[],
  sourceLabel: string,
  sourceHref: string,
  definition: DrillDefinition,
): WorldQuantDrill {
  return {
    id,
    version: 1,
    variant,
    competency,
    conceptIds,
    title: definition.title,
    kind: definition.kind,
    language: definition.language,
    estimatedMinutes: definition.estimatedMinutes,
    prompt: definition.prompt,
    starterCode: definition.starterCode,
    followUps: [
      { id: `${id}-follow-up-1`, prompt: definition.followUps[0] },
      { id: `${id}-follow-up-2`, prompt: definition.followUps[1] },
    ],
    rubric: definition.rubric,
    sourceLabel,
    sourceHref,
  };
}

export function assertCompleteDrillCatalog() {
  const covered = new Set(
    worldQuantDrillPacks.map((drillPack) => drillPack.competency),
  );
  return worldQuantCompetencyKeys.every((competency) =>
    covered.has(competency),
  );
}
