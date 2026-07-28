import type { CurriculumDrillEvidence, WorldQuantConceptId } from "./curriculum";
import {
  worldQuantCompetencyKeys,
  type WorldQuantCompetencyKey,
} from "./readiness";

export const WORLDQUANT_DRILL_CATALOG_VERSION = 2 as const;
export const WORLDQUANT_SUPPORTED_DRILL_CATALOG_VERSIONS = [
  1,
  WORLDQUANT_DRILL_CATALOG_VERSION,
] as const;
export type WorldQuantDrillCatalogVersion =
  (typeof WORLDQUANT_SUPPORTED_DRILL_CATALOG_VERSIONS)[number];
const assessmentEquivalentDrillRevisionGroups = [
  [1, 2],
] as const satisfies readonly (
  readonly WorldQuantDrillCatalogVersion[]
)[];

export function isWorldQuantDrillCatalogVersion(
  value: unknown,
): value is WorldQuantDrillCatalogVersion {
  return WORLDQUANT_SUPPORTED_DRILL_CATALOG_VERSIONS.includes(
    value as WorldQuantDrillCatalogVersion,
  );
}

export function areWorldQuantDrillRevisionsAssessmentEquivalent(
  left: WorldQuantDrillCatalogVersion,
  right: WorldQuantDrillCatalogVersion,
) {
  if (left === right) return true;
  // v2 only localizes the v1 wording; exercise structure and scoring stay the same.
  return assessmentEquivalentDrillRevisionGroups.some(
    (group) => group.includes(left) && group.includes(right),
  );
}

export type WorldQuantDrillKind =
  | "explain"
  | "diagnose"
  | "implement"
  | "design"
  | "incident";

export type WorldQuantDrill = {
  id: string;
  version: typeof WORLDQUANT_DRILL_CATALOG_VERSION;
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
  version: typeof WORLDQUANT_DRILL_CATALOG_VERSION;
  competency: WorldQuantCompetencyKey;
  title: string;
  summary: string;
  practice: WorldQuantDrill;
  checkpoint: WorldQuantDrill;
  checkpointRetry: WorldQuantDrill;
};

export type WorldQuantDrillAssessmentDescriptor = Pick<
  WorldQuantDrill,
  "id" | "variant" | "competency" | "conceptIds"
> & {
  rubricTotal: number;
};

type WorldQuantDrillAssessmentPackDescriptor = {
  id: string;
  competency: WorldQuantCompetencyKey;
  conceptIds: readonly WorldQuantConceptId[];
  rubricTotals: readonly [
    practice: number,
    checkpoint: number,
    checkpointRetry: number,
  ];
};

// Frozen assessment structure for catalog v1. Catalog v2 only rewrites wording,
// so both revisions intentionally point to this immutable descriptor set.
const worldQuantDrillAssessmentPacksV1 = [
  {
    id: "modern-cpp-lifetime",
    competency: "modern_cpp",
    conceptIds: [
      "cpp-lifetime-ownership",
      "cpp-types-templates",
      "cpp-standards-idioms",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "algorithms-streaming",
    competency: "algorithms_data_structures",
    conceptIds: [
      "algorithms-complexity",
      "algorithms-containers",
      "algorithms-streaming",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "concurrency-pipeline",
    competency: "concurrency_memory",
    conceptIds: [
      "concurrency-memory-model",
      "concurrency-synchronization",
      "concurrency-backpressure",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "performance-latency",
    competency: "performance_latency",
    conceptIds: [
      "performance-cache-allocation",
      "performance-profiling",
      "performance-capacity",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "linux-network",
    competency: "linux_networking",
    conceptIds: [
      "linux-process-io",
      "linux-network-protocols",
      "linux-observability",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "distributed-data",
    competency: "distributed_data_platform",
    conceptIds: [
      "distributed-partitioning",
      "distributed-streaming",
      "distributed-consistency",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "tick-market-data",
    competency: "tick_market_data",
    conceptIds: [
      "tick-feed-integrity",
      "tick-order-book",
      "tick-interval-features",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "build-delivery",
    competency: "build_delivery",
    conceptIds: [
      "build-target-cmake",
      "build-test-sanitizer",
      "build-ci-release",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "scripting-reconciliation",
    competency: "scripting_automation",
    conceptIds: [
      "scripting-python-data",
      "scripting-perl-legacy",
      "scripting-reconciliation",
    ],
    rubricTotals: [4, 4, 4],
  },
  {
    id: "ownership-communication",
    competency: "ownership_communication",
    conceptIds: [
      "ownership-requirements",
      "ownership-incidents",
      "ownership-english",
    ],
    rubricTotals: [4, 4, 4],
  },
] as const satisfies readonly WorldQuantDrillAssessmentPackDescriptor[];

const worldQuantDrillAssessmentManifestV1 =
  buildWorldQuantDrillAssessmentManifest(
    worldQuantDrillAssessmentPacksV1,
  );
const worldQuantDrillAssessmentManifests = {
  1: worldQuantDrillAssessmentManifestV1,
  2: worldQuantDrillAssessmentManifestV1,
} as const satisfies Record<
  WorldQuantDrillCatalogVersion,
  ReadonlyMap<string, WorldQuantDrillAssessmentDescriptor>
>;

export function worldQuantDrillAssessmentDescriptor(
  id: string,
  version: WorldQuantDrillCatalogVersion,
) {
  return (
    worldQuantDrillAssessmentManifests[version].get(id) ?? null
  );
}

export const worldQuantDrillPacks: readonly WorldQuantDrillPack[] = [
  pack({
    id: "modern-cpp-lifetime",
    competency: "modern_cpp",
    title: "Quyền sở hữu trong C++ hiện đại khi chịu tải",
    summary:
      "Luyện vòng đời, ràng buộc API và thiết kế không sao chép (zero-copy) mà không để view trỏ tới dữ liệu đã hết vòng đời (dangling view).",
    conceptIds: [
      "cpp-lifetime-ownership",
      "cpp-types-templates",
      "cpp-standards-idioms",
    ],
    sourceLabel: "Kho bài học C++",
    sourceHref: "/?deck=cpp-interview",
    practice: {
      title: "Sửa sự kiện thị trường có view trỏ tới dữ liệu hết vòng đời",
      kind: "implement",
      language: "cpp",
      estimatedMinutes: 16,
      prompt:
        "API giải mã trả về string_view và span trỏ vào gói tin được truyền theo giá trị. Hãy sửa ràng buộc để vòng đời rõ ràng, hạn chế sao chép trên luồng xử lý cần hiệu năng cao (hot path) và giải thích bất biến mà bên gọi phải bảo đảm.",
      starterCode: `struct EventView {
  std::string_view symbol;
  std::span<const std::byte> payload;
};

EventView decode(std::vector<std::byte> packet);`,
      followUps: [
        "Thiết kế thay đổi thế nào nếu sự kiện phải tồn tại lâu hơn bộ đệm nhận?",
        "Bạn sẽ kiểm thử và đo lường lỗi vòng đời này trong hệ thống thực tế ra sao?",
      ],
      rubric: [
        "Chỉ ra chính xác đối tượng sở hữu bị hủy khi hàm giải mã trả về.",
        "Ràng buộc biểu diễn rõ đối tượng sở hữu hoặc quan hệ phụ thuộc vòng đời.",
        "Nêu được đánh đổi giữa kết quả sở hữu dữ liệu và view mượn dữ liệu.",
        "Có kiểm thử tại ranh giới hoặc công cụ phát hiện lỗi (sanitizer) phù hợp.",
      ],
    },
    checkpoint: {
      title: "Bảo vệ thiết kế API nguồn dữ liệu không sao chép",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Thiết kế API C++20 cho bộ giải mã nhận các ô trong bộ đệm vòng (ring buffer) được tái sử dụng. Bên tiêu thụ có thể xử lý đồng bộ hoặc chuyển việc sang luồng xử lý. Hãy trình bày kiểu dữ liệu, quyền sở hữu, kiểm soát quá tải và điều kiện để không sao chép (zero-copy) vẫn an toàn.",
      starterCode: null,
      followUps: [
        "Nếu luồng xử lý chậm hơn bên tạo dữ liệu thì API phải phản ứng thế nào?",
        "Nếu nâng mã nguồn từ C++11 lên C++20, bạn sẽ triển khai dần ràng buộc mới ra sao?",
      ],
      rubric: [
        "Phân biệt vòng đời đồng bộ và bất đồng bộ.",
        "Không giữ view sau khi ô nhớ được tái sử dụng nếu thiếu thẻ quyền sở hữu.",
        "Có cơ chế kiểm soát quá tải giới hạn hoặc phương án sao chép dự phòng rõ ràng.",
        "Nêu chiến lược nâng cấp và tương thích.",
      ],
    },
    checkpointRetry: {
      title: "Thiết kế cách bàn giao lô dữ liệu chỉ được di chuyển",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Một bộ phân tích C++20 tạo các đối tượng EventBatch trong vùng nhớ std::pmr có thể tái sử dụng, rồi bàn giao cho các luồng có thể giữ công việc lâu hơn chu kỳ nhận hiện tại. Hãy thiết kế kiểu dữ liệu công khai và giao thức bàn giao để quyền sở hữu, vòng đời bộ cấp phát và việc hủy tác vụ đều rõ ràng mà không buộc phải cấp phát riêng cho từng sự kiện.",
      starterCode: null,
      followUps: [
        "Ràng buộc sẽ thay đổi thế nào với một bên quan sát đồng bộ không bao giờ giữ lại sự kiện?",
        "Kiểm thử nào tại thời điểm biên dịch và khi chạy có thể phát hiện việc vô tình sao chép hoặc tái sử dụng vùng nhớ?",
      ],
      rubric: [
        "Tách trạng thái lô sở hữu dữ liệu khỏi các view sự kiện không sở hữu dữ liệu.",
        "Bảo đảm vòng đời bộ cấp phát và vùng nhớ kéo dài đủ cho mọi bên tiêu thụ bất đồng bộ.",
        "Dùng cơ chế chỉ được di chuyển hoặc thẻ bàn giao với điểm giải phóng rõ ràng.",
        "Giải thích việc hủy, kiểm soát quá tải và kiểm thử lỗi tái sử dụng hoặc sao chép.",
      ],
    },
  }),
  pack({
    id: "algorithms-streaming",
    competency: "algorithms_data_structures",
    title: "Thuật toán cho luồng dữ liệu thị trường",
    summary:
      "Chọn cấu trúc dữ liệu và chứng minh độ phức tạp dưới tải xử lý luồng.",
    conceptIds: [
      "algorithms-complexity",
      "algorithms-containers",
      "algorithms-streaming",
    ],
    sourceLabel: "Kho câu hỏi C++",
    sourceHref: "/?deck=cpp-interview",
    practice: {
      title: "Cửa sổ trượt cho mức giá tốt nhất",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 15,
      prompt:
        "Thiết kế cấu trúc giữ chênh lệch giá nhỏ nhất, lớn nhất và trung vị trong cửa sổ 60 giây với tick đến theo dấu thời gian. Nêu các thao tác, độ phức tạp, giới hạn bộ nhớ và chính sách xử lý dữ liệu đến muộn.",
      starterCode: null,
      followUps: [
        "Nếu thông lượng tăng 20 lần, điểm nghẽn đầu tiên có thể nằm ở đâu?",
        "Khi nào bạn chọn phân vị xấp xỉ thay vì trung vị chính xác?",
      ],
      rubric: [
        "Mô tả rõ cách loại dữ liệu cũ theo thời gian.",
        "Chọn cấu trúc chứa (container) phù hợp cho giá trị nhỏ nhất, lớn nhất và trung vị.",
        "Phân tích độ phức tạp thời gian và bộ nhớ.",
        "Có chính sách xác định cho dữ liệu đến muộn hoặc sai thứ tự.",
      ],
    },
    checkpoint: {
      title: "Bộ phát hiện dữ liệu trùng có giới hạn",
      kind: "implement",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Nguồn dữ liệu có số thứ tự 64-bit; dữ liệu trùng có thể xuất hiện trong một triệu thông điệp gần nhất. Hãy thiết kế bộ phát hiện dùng bộ nhớ có giới hạn, giải thích việc quay vòng/đặt lại và chứng minh khoảng thiếu không bị nhầm thành dữ liệu trùng.",
      starterCode: `class DuplicateWindow {
public:
  bool seen_or_insert(std::uint64_t sequence);
  void reset(std::uint64_t snapshot_sequence);
};`,
      followUps: [
        "So sánh bitmap/ring với unordered_set cho tải này.",
        "Bạn đo hiệu năng bộ phát hiện thế nào để không vô tình chỉ đo bộ cấp phát?",
      ],
      rubric: [
        "Trạng thái được giới hạn theo cửa sổ.",
        "Phân biệt dữ liệu trùng, dữ liệu cũ và khoảng thiếu phía trước.",
        "Ngữ nghĩa đặt lại và ảnh chụp trạng thái rõ ràng.",
        "Độ phức tạp và hành vi bộ nhớ đệm được giải thích.",
      ],
    },
    checkpointRetry: {
      title: "Xếp hạng mã giao dịch nổi bật trong một lượt",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Một nguồn dữ liệu chứa hàng chục triệu giao dịch và số lượng mã quá lớn để giữ mọi bộ đếm. Hãy thiết kế thuật toán xử lý luồng dùng bộ nhớ có giới hạn để báo cáo 100 mã có tổng giá trị giao dịch cao nhất mỗi phút, gồm giới hạn sai số, cách xử lý đồng hạng xác định và các điều chỉnh đến muộn.",
      starterCode: null,
      followUps: [
        "Khi nào giải pháp chính xác dùng heap và map phù hợp hơn thuật toán ước lượng phần tử xuất hiện nhiều?",
        "Bạn sẽ gộp kết quả từ các phân vùng thế nào mà không phóng đại độ chính xác?",
      ],
      rubric: [
        "Chọn thuật toán chính xác hoặc xấp xỉ phù hợp với giới hạn bộ nhớ đã nêu.",
        "Nêu độ phức tạp khi cập nhật, truy vấn và gộp.",
        "Xác định bảo đảm sai số và ngữ nghĩa xếp hạng có tính xác định.",
        "Xử lý rõ việc chuyển cửa sổ, điều chỉnh đến muộn và tổng hợp phân vùng.",
      ],
    },
  }),
  pack({
    id: "concurrency-pipeline",
    competency: "concurrency_memory",
    title: "Luồng xử lý dữ liệu đồng thời",
    summary:
      "Lập luận về mô hình bộ nhớ, đồng bộ và quá tải thay vì chỉ chọn khóa.",
    conceptIds: [
      "concurrency-memory-model",
      "concurrency-synchronization",
      "concurrency-backpressure",
    ],
    sourceLabel: "Mô hình năng lực WorldQuant",
    sourceHref: "/worldquant",
    practice: {
      title: "Chẩn đoán tranh chấp khi công bố dữ liệu",
      kind: "diagnose",
      language: "cpp",
      estimatedMinutes: 16,
      prompt:
        "Bên tạo dữ liệu ghi nội dung rồi công bố chỉ mục; bên tiêu thụ đôi lúc thấy chỉ mục mới nhưng nội dung cũ. Hãy chỉ ra tranh chấp dữ liệu hoặc quan hệ thứ tự giữa thao tác (happens-before) còn thiếu và đề xuất ràng buộc nguyên tử hoặc đồng bộ tối thiểu.",
      starterCode: `payload[slot] = decoded;
published.store(slot, std::memory_order_relaxed);

auto slot = published.load(std::memory_order_relaxed);
consume(payload[slot]);`,
      followUps: [
        "Release/acquire ở đây bảo đảm điều gì và không bảo đảm điều gì?",
        "Nếu có nhiều bên tạo dữ liệu, thiết kế phải đổi ở đâu?",
      ],
      rubric: [
        "Chỉ ra phép công bố relaxed không tạo quan hệ thứ tự happens-before.",
        "Đề xuất release/acquire hoặc cơ chế đồng bộ mạnh hơn đúng chỗ.",
        "Xử lý việc tái sử dụng ô nhớ và quyền sở hữu.",
        "Không cho rằng thao tác nguyên tử tự giải quyết được giao thức có nhiều bên tạo dữ liệu.",
      ],
    },
    checkpoint: {
      title: "Thiết kế phân phối dữ liệu có giới hạn",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Một tick đã chuẩn hóa phải đến ba bên tiêu thụ có tốc độ khác nhau. Hãy thiết kế cách phân phối có giới hạn, dừng an toàn và chính sách quá tải mà không để bên chậm làm tăng độ trễ của tất cả.",
      starterCode: null,
      followUps: [
        "Bạn đo tranh chấp tài nguyên và chia sẻ giả (false sharing) ở đâu?",
        "Khi loại bỏ dữ liệu, hệ thống chứng minh trạng thái phía sau vẫn đúng bằng cách nào?",
      ],
      rubric: [
        "Nêu quyền sở hữu thông điệp giữa các bên tiêu thụ.",
        "Hàng đợi và sức chứa có giới hạn rõ.",
        "Chính sách quá tải, loại bỏ và đồng bộ lại vẫn giữ tính đúng đắn.",
        "Quá trình dừng không có tranh chấp và có thể quan sát được.",
      ],
    },
    checkpointRetry: {
      title: "Đóng hàng đợi tiếp nhận mà không mất công việc",
      kind: "diagnose",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Một hàng đợi tiếp nhận MPSC đôi lúc bị treo khi dừng: bên tạo dữ liệu vẫn có thể giữ chỗ trong khi bên tiêu thụ thấy stop=true và thoát. Hãy chẩn đoán tranh chấp trong máy trạng thái và thiết kế giao thức đóng/xử lý hết dữ liệu có giới hạn, với bảo đảm rõ ràng về thứ tự bộ nhớ và quyền sở hữu.",
      starterCode: null,
      followUps: [
        "Làm sao ngăn một bên tạo dữ liệu đã giữ chỗ nhưng chưa công bố khiến quá trình dừng bị chặn mãi?",
        "Kiểm thử tải nặng hoặc dựa trên mô hình nào giúp phân biệt việc bỏ lỡ tín hiệu đánh thức với lỗi thứ tự bộ nhớ?",
      ],
      rubric: [
        "Chỉ ra tranh chấp giữa việc giữ chỗ, công bố và quan sát tín hiệu dừng.",
        "Xác định điểm tuyến tính hóa cho thao tác đóng, công bố và xử lý hết dữ liệu.",
        "Dùng đồng bộ và thứ tự bộ nhớ kèm lập luận happens-before.",
        "Giới hạn thời gian dừng và xử lý trường hợp bỏ chỗ đã giữ, đánh thức cùng khả năng quan sát.",
      ],
    },
  }),
  pack({
    id: "performance-latency",
    competency: "performance_latency",
    title: "Độ trễ dựa trên bằng chứng",
    summary:
      "Luyện đo lường, bộ nhớ đệm/cấp phát và lập luận về năng lực xử lý ở p99.",
    conceptIds: [
      "performance-cache-allocation",
      "performance-profiling",
      "performance-capacity",
    ],
    sourceLabel: "Bài học hiệu năng C++",
    sourceHref: "/?deck=cpp-interview",
    practice: {
      title: "Giải thích lỗi tăng độ trễ p99",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 15,
      prompt:
        "Sau khi phát hành, độ trễ trung vị không đổi nhưng p99 tăng bốn lần khi thị trường mở cửa. Hãy lập cây điều tra, số liệu cần thu và thí nghiệm để tách ảnh hưởng của cấp phát, tranh chấp khóa, I/O và xử lý theo lô.",
      starterCode: null,
      followUps: [
        "Làm sao tránh công cụ phân tích làm thay đổi tải đang đo?",
        "Khi quay lui khắc phục được triệu chứng, bước chịu trách nhiệm tiếp theo là gì?",
      ],
      rubric: [
        "Phân biệt độ trễ trung vị và độ trễ đuôi.",
        "Đặt giả thuyết có thể bị bác bỏ bằng thí nghiệm.",
        "Dùng tải và mốc so sánh có tính đại diện.",
        "Có biện pháp giảm thiểu, quay lui và theo dõi tiếp.",
      ],
    },
    checkpoint: {
      title: "Bảo vệ đề xuất xử lý theo lô",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Đề xuất xử lý 32 tick mỗi lô để tăng thông lượng. Hãy xây mô hình hiệu năng, kế hoạch đo và hàng rào bảo vệ khi phát hành để chứng minh lợi ích không phá SLA độ trễ hoặc thứ tự dữ liệu.",
      starterCode: null,
      followUps: [
        "Kích thước lô nên cố định hay tự điều chỉnh theo độ dài hàng đợi?",
        "Những số liệu nào khiến bạn hủy thay đổi dù thông lượng tăng?",
      ],
      rubric: [
        "Nêu định lượng đánh đổi giữa thông lượng và độ trễ.",
        "Giữ thứ tự và ngữ nghĩa dấu thời gian.",
        "Phép đo có giai đoạn làm nóng, phân bố kết quả và tải thực tế.",
        "Có thử nghiệm giới hạn, ngưỡng quyết định và phương án quay lui.",
      ],
    },
    checkpointRetry: {
      title: "Cô lập đột biến độ trễ liên quan đến NUMA",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Sau khi chuyển tiến trình nguồn dữ liệu sang máy hai socket lớn hơn, thông lượng tăng nhưng độ trễ p99 chỉ đột biến khi luồng xử lý được chuyển giữa các socket. Hãy xây kế hoạch đo lường và khắc phục gồm bố trí NUMA, tính cục bộ của bộ nhớ đệm, cấp phát và những yếu tố có thể làm sai lệch phép đo.",
      starterCode: null,
      followUps: [
        "Bằng chứng nào giúp phân biệt truy cập bộ nhớ từ xa với tranh chấp khóa?",
        "Bạn sẽ thử nghiệm giới hạn việc ghim CPU thế nào mà không che giấu vấn đề năng lực xử lý bên dưới?",
      ],
      rubric: [
        "Bắt đầu từ độ trễ theo từng luồng, vị trí CPU và bằng chứng về tính cục bộ NUMA.",
        "Kiểm soát tải, tần số, giai đoạn làm nóng và chi phí của công cụ phân tích.",
        "Tách các giả thuyết về cấp phát, chuyển luồng, bộ nhớ đệm và đồng bộ.",
        "Đề xuất biện pháp có thể hoàn tác cùng hàng rào bảo vệ về năng lực xử lý và lỗi tái phát.",
      ],
    },
  }),
  pack({
    id: "linux-network",
    competency: "linux_networking",
    title: "Chẩn đoán Linux và mạng truyền dữ liệu",
    summary:
      "Chẩn đoán I/O, socket và bằng chứng từ hệ thống thực tế.",
    conceptIds: [
      "linux-process-io",
      "linux-network-protocols",
      "linux-observability",
    ],
    sourceLabel: "Lộ trình hệ thống WorldQuant",
    sourceHref: "/worldquant",
    practice: {
      title: "Phân loại nguyên nhân mất gói multicast",
      kind: "incident",
      language: "shell",
      estimatedMinutes: 16,
      prompt:
        "Một máy nhận dữ liệu thị trường báo thiếu số thứ tự khi lưu lượng tăng đột biến; máy khác cùng nguồn không lỗi. Hãy trình bày theo thứ tự các lệnh và số liệu Linux để kiểm tra NIC, gói bị loại trong kernel, bộ đệm socket, lập lịch CPU và hàng đợi ứng dụng.",
      starterCode: null,
      followUps: [
        "Dùng bằng chứng nào để phân biệt gói bị mất trước NIC, trong kernel và trong ứng dụng?",
        "Tăng bộ đệm nhận có thể che hoặc tạo vấn đề gì?",
      ],
      rubric: [
        "Đi từ mạng/NIC đến kernel/socket rồi ứng dụng.",
        "Nêu bộ đếm hoặc công cụ cụ thể.",
        "Không điều chỉnh cấu hình trước khi có mốc so sánh.",
        "Có cách tái hiện và xác nhận bản sửa.",
      ],
    },
    checkpoint: {
      title: "Giao thức kết nối lại không chặn",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Thiết kế chương trình TCP không chặn để nhận ảnh chụp trạng thái và các cập nhật tăng dần. Bao gồm phân khung thông điệp, đọc một phần, hết thời gian chờ, kết nối lại, phản hồi trùng và cách không công bố trạng thái chưa đồng bộ.",
      starterCode: null,
      followUps: [
        "Epoll kích hoạt theo cạnh làm thay đổi vòng lặp đọc thế nào?",
        "Nếu ảnh chụp trạng thái lớn hơn giới hạn bộ nhớ thì xử lý ra sao?",
      ],
      rubric: [
        "Xử lý đọc/ghi một phần và phân khung thông điệp.",
        "Máy trạng thái kết nối lại có thời gian chờ và khoảng nghỉ tăng dần.",
        "Ranh giới giữa ảnh chụp trạng thái và cập nhật tăng dần giữ tính nhất quán.",
        "Có số liệu cho mất kết nối, độ trễ và lỗi phân tích.",
      ],
    },
    checkpointRetry: {
      title: "Chẩn đoán vòng lặp epoll chiếm CPU",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Một tiến trình nhận dữ liệu không chặn đột nhiên dùng trọn một lõi CPU dù lưu lượng tiếp nhận gần bằng không. Nhật ký cho thấy epoll liên tục đánh thức trên các kết nối vừa đóng và bộ mô tả tệp (file descriptor) đang được tái sử dụng. Hãy chẩn đoán lỗi vòng đời có thể xảy ra và đề xuất ràng buộc an toàn cho vòng lặp sự kiện.",
      starterCode: null,
      followUps: [
        "Ngữ nghĩa kích hoạt theo cạnh và theo mức làm thay đổi cách điều tra thế nào?",
        "Quan sát nào ở kernel và ứng dụng chứng minh bản sửa đúng khi kết nối lại liên tục?",
      ],
      rubric: [
        "Kiểm tra cờ sẵn sàng, vòng lặp đọc hết dữ liệu, thứ tự đóng và việc tái sử dụng bộ mô tả.",
        "Gắn sự kiện với thế hệ kết nối thay vì chỉ dùng bộ mô tả tệp.",
        "Xử lý rõ EAGAIN, lỗi, đóng một chiều và hủy đăng ký.",
        "Có kiểm thử kết nối/đóng lặp lại tái lập được cùng số liệu CPU, số lần đánh thức và sự kiện cũ.",
      ],
    },
  }),
  pack({
    id: "distributed-data",
    competency: "distributed_data_platform",
    title: "Nền tảng dữ liệu tick phân tán",
    summary:
      "Phân vùng, xử lý luồng và chuyển đổi dữ liệu với tính lặp an toàn cùng khả năng đối chiếu tương đương.",
    conceptIds: [
      "distributed-partitioning",
      "distributed-streaming",
      "distributed-consistency",
    ],
    sourceLabel: "Hướng dẫn dữ liệu tick",
    sourceHref: "/learn/tick-data-order-book",
    practice: {
      title: "Khôi phục phân vùng quá tải",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 17,
      prompt:
        "Luồng xử lý phân vùng theo mã giao dịch nhưng một mã chiếm 35% lưu lượng. Hãy thiết kế biện pháp giảm tải vẫn giữ thứ tự theo từng công cụ, trạng thái có giới hạn và khả năng phát lại khi cân bằng lại.",
      starterCode: null,
      followUps: [
        "Nếu tách một mã giao dịch qua nhiều luồng xử lý thì bất biến nào bị phá?",
        "Điểm kiểm tra và vị trí đọc phải được ghi nhận theo thứ tự nào?",
      ],
      rubric: [
        "Giữ khóa thứ tự rõ ràng.",
        "Nêu đánh đổi giữa phân vùng lại, cô lập và tăng tài nguyên máy.",
        "Chuyển trạng thái điểm kiểm tra/vị trí đọc có tính lặp an toàn.",
        "Có kế hoạch quay lui hoặc phát lại.",
      ],
    },
    checkpoint: {
      title: "Phải chứng minh tuyên bố xử lý đúng một lần",
      kind: "diagnose",
      language: "cpp",
      estimatedMinutes: 18,
      prompt:
        "Nhóm cho rằng đầu ra theo khoảng thời gian được xử lý đúng một lần vì bên tiêu thụ ghi nhận vị trí đọc sau khi ghi cơ sở dữ liệu. Hãy phân tích các khoảng lỗi, kết quả trùng/thiếu và thiết kế ràng buộc lặp an toàn trong thực tế.",
      starterCode: null,
      followUps: [
        "Khóa loại trùng và thời gian lưu được chọn thế nào?",
        "Tác vụ bù dữ liệu chạy song song với luồng trực tiếp cần không gian tên và phiên bản ra sao?",
      ],
      rubric: [
        "Liệt kê sự cố trước/sau khi ghi dữ liệu và trước/sau khi ghi nhận vị trí đọc.",
        "Không dùng khái niệm xử lý đúng một lần như khẩu hiệu.",
        "Có khóa lặp an toàn hoặc ranh giới giao dịch.",
        "Cách tác vụ bù dữ liệu cùng tồn tại với luồng trực tiếp và việc kiểm toán đều rõ ràng.",
      ],
    },
    checkpointRetry: {
      title: "Nối tác vụ bù dữ liệu vào luồng trực tiếp",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 19,
      prompt:
        "Một tác vụ bù dữ liệu tick trong một năm phải ghi vào kho đặc trưng mới trong khi việc tiếp nhận trực tiếp vẫn diễn ra. Hãy thiết kế quyền sở hữu phân vùng, mốc thời gian và cách bàn giao từ xử lý dữ liệu lịch sử sang dữ liệu trực tiếp để mọi khóa đều có kết quả xác định, kiểm toán được mà không dừng hệ thống.",
      starterCode: null,
      followUps: [
        "Bạn khôi phục thế nào nếu một phân vùng lỗi sau khi công bố đầu ra nhưng trước khi ghi dấu bàn giao?",
        "Thiết kế thay đổi thế nào khi dữ liệu điều chỉnh có thể đến cho những ngày đã được đánh dấu hoàn tất?",
      ],
      rubric: [
        "Xác định thứ tự theo từng khóa và ranh giới rõ giữa dữ liệu lịch sử với dữ liệu trực tiếp.",
        "Dùng định danh đầu ra lặp an toàn và điểm kiểm tra có thể khởi động lại.",
        "Ngăn nhiều bên ghi đồng thời âm thầm sở hữu cùng một phạm vi.",
        "Bao quát dữ liệu điều chỉnh, nguồn gốc kiểm toán, kiểm tra hợp lệ và quay lui.",
      ],
    },
  }),
  pack({
    id: "tick-market-data",
    competency: "tick_market_data",
    title: "Tính đúng đắn của dữ liệu tick và sổ lệnh",
    summary:
      "Tính toàn vẹn nguồn dữ liệu, trạng thái sổ lệnh và đặc trưng theo khoảng thời gian được kiểm chứng bằng phát lại xác định.",
    conceptIds: [
      "tick-feed-integrity",
      "tick-order-book",
      "tick-interval-features",
    ],
    sourceLabel: "Hướng dẫn dữ liệu tick và sổ lệnh",
    sourceHref: "/learn/tick-data-order-book",
    practice: {
      title: "Sửa luồng cập nhật sổ lệnh L2",
      kind: "implement",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Hoàn thiện hàm apply cho sổ lệnh L2: từ chối khoảng thiếu, bỏ qua dữ liệu trùng, quantity=0 thì xóa mức giá và giữ giá mua tốt nhất nhỏ hơn giá bán tốt nhất. Giải thích khi nào phải vô hiệu hóa sổ lệnh và yêu cầu ảnh chụp trạng thái.",
      starterCode: `bool OrderBook::apply(const LevelUpdate& update) {
  // TODO: sequence, insert/update/delete and invariants.
}`,
      followUps: [
        "Sổ lệnh bị giao cắt có luôn là lỗi trên thiết bị không?",
        "Bạn phát lại bộ dữ liệu kiểm thử nào để chứng minh trạng thái có tính xác định?",
      ],
      rubric: [
        "Chuyển số thứ tự phân biệt dữ liệu trùng và khoảng thiếu.",
        "Thêm, cập nhật và xóa đúng theo bên mua/bán.",
        "Bất biến của sổ lệnh được kiểm tra mà không che sự kiện nguồn hợp lệ.",
        "Có đồng bộ lại và phát lại xác định.",
      ],
    },
    checkpoint: {
      title: "Chuyển đổi đặc trưng theo khoảng thời gian mà không làm lệch alpha",
      kind: "design",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Hệ thống cũ và nền tảng mới lệch VWAP ở 0,02% số khoảng thời gian. Hãy điều tra ngữ nghĩa, độ chính xác, dữ liệu thiếu và thứ tự sự kiện; sau đó thiết kế cổng đối chiếu tương đương, chuyển đổi chính thức và quay lui.",
      starterCode: null,
      followUps: [
        "Ngưỡng sai số nào thuộc quyết định kỹ thuật, ngưỡng nào cần nhà nghiên cứu xác nhận?",
        "Nếu hệ thống cũ có lỗi nhưng tín hiệu lại phụ thuộc vào lỗi đó thì xử lý thế nào?",
      ],
      rubric: [
        "So sánh tính đồng nhất của đầu vào trước khi so đầu ra.",
        "Kiểm tra thứ tự, ranh giới, dữ liệu thiếu và độ chính xác.",
        "Ngưỡng sai số có người chịu trách nhiệm và lý do rõ ràng.",
        "Chuyển giao/quay lui bảo vệ công việc của nhà nghiên cứu.",
      ],
    },
    checkpointRetry: {
      title: "Khôi phục sổ lệnh sau khi chuyển kênh dự phòng",
      kind: "incident",
      language: "cpp",
      estimatedMinutes: 20,
      prompt:
        "Kênh dữ liệu thị trường chính và dự phòng bị chồng lấn khi chuyển kênh. Kênh dự phòng bắt đầu từ số thứ tự cũ hơn, ảnh chụp trạng thái sau đó thuộc một phiên sổ lệnh khác và nhiều giao dịch đến giữa lúc yêu cầu với lúc nhận ảnh chụp. Hãy thiết kế máy trạng thái đối soát trước khi công bố lại sổ lệnh.",
      starterCode: null,
      followUps: [
        "Định danh nào giúp phân biệt gói tin trùng với một phiên nguồn dữ liệu mới?",
        "Phát lại xác định sẽ chứng minh thế nào rằng không có sổ lệnh cũ nào được công bố trong lúc chuyển kênh?",
      ],
      rubric: [
        "Tách số thứ tự kênh, phiên ảnh chụp trạng thái và trạng thái công cụ.",
        "Lưu đệm hoặc từ chối các cập nhật quanh ranh giới ảnh chụp theo cách xác định.",
        "Chỉ công bố sau khi khôi phục tính liên tục và các bất biến của sổ lệnh.",
        "Có bộ đệm giới hạn, thời gian chờ, bằng chứng phát lại và số liệu đồng bộ lại.",
      ],
    },
  }),
  pack({
    id: "build-delivery",
    competency: "build_delivery",
    title: "CMake, kiểm thử và phát hành",
    summary:
      "Đồ thị target, công cụ phát hiện lỗi (sanitizer), điều kiện kiểm soát CI và phương án quay lui có thể tái lập.",
    conceptIds: [
      "build-target-cmake",
      "build-test-sanitizer",
      "build-ci-release",
    ],
    sourceLabel: "Hướng dẫn học CMake",
    sourceHref: "/learn/cmake",
    practice: {
      title: "Xây đồ thị kiểm thử theo target",
      kind: "implement",
      language: "cmake",
      estimatedMinutes: 18,
      prompt:
        "Viết CMakeLists tạo thư viện feed_decoder, chương trình kiểm thử, yêu cầu sử dụng đúng phạm vi, C++20 và CTest. Không dùng include_directories hoặc CXX_FLAGS toàn cục.",
      starterCode: `cmake_minimum_required(VERSION 3.25)
project(feed LANGUAGES CXX)

# TODO`,
      followUps: [
        "Thêm tùy chọn bật ASan/UBSan mà không làm rò cờ sang các target sử dụng thế nào?",
        "Giao diện khi đóng gói hoặc cài đặt khác giao diện trong thư mục dựng dự án (build tree) ở đâu?",
      ],
      rubric: [
        "Thư viện và chương trình kiểm thử là các target riêng.",
        "Include/link scope PUBLIC/PRIVATE hợp lý.",
        "Chuẩn C++ là thuộc tính của target.",
        "Tùy chọn CTest và sanitizer không dùng cờ toàn cục.",
      ],
    },
    checkpoint: {
      title: "Thiết kế quy trình chuyển đổi có thể tái lập",
      kind: "design",
      language: "cmake",
      estimatedMinutes: 18,
      prompt:
        "Hệ thống dựng cũ dùng tập lệnh shell và đường dẫn riêng trên từng máy. Hãy thiết kế việc chuyển sang CMake/Ninja với phiên bản phụ thuộc được cố định, ma trận CI, nguồn gốc sản phẩm được tạo khi dựng và phương án quay lui mà vẫn phát hành đều.",
      starterCode: null,
      followUps: [
        "Bạn chứng minh chương trình cũ và mới tương đương ở mức nào?",
        "Khi nâng trình biên dịch làm đổi kết quả số thực, cổng kiểm tra xử lý ra sao?",
      ],
      rubric: [
        "Chuyển đổi từng bước có ranh giới tương thích.",
        "Phiên bản phụ thuộc và bộ công cụ được cố định, truy vết được.",
        "CI kiểm tra quá trình dựng, kiểm thử, sanitizer và sản phẩm tạo ra.",
        "Có bằng chứng tương đương và phương án quay lui.",
      ],
    },
    checkpointRetry: {
      title: "Tạo header sinh tự động có đầu vào khép kín",
      kind: "implement",
      language: "cmake",
      estimatedMinutes: 18,
      prompt:
        "Một trình biên dịch schema sinh header C++, nhưng Ninja khi dựng song song đôi lúc dùng tệp cũ và gói đã cài đặt lại làm lộ đường dẫn thuộc thư mục dựng dự án (build tree). Hãy thiết kế đồ thị target CMake cho việc sinh, sử dụng, kiểm thử và cài đặt hoặc xuất gói mà không tạo tác dụng phụ từ lệnh shell ở bước cấu hình.",
      starterCode: `add_custom_command(
  OUTPUT "\${CMAKE_CURRENT_BINARY_DIR}/generated/feed_schema.hpp"
  # TODO: command, dependencies and byproducts
)`,
      followUps: [
        "Depfile hoặc BYPRODUCTS ảnh hưởng thế nào đến tính đúng đắn của quá trình dựng tăng dần trên các trình tạo khác nhau?",
        "Các target sử dụng sẽ tìm header đã sinh ở đâu sau khi cài đặt?",
      ],
      rubric: [
        "Mô hình hóa rõ đầu ra được sinh cùng mọi phụ thuộc vào schema và công cụ.",
        "Nối bước sinh với target sử dụng mà không dùng mẹo thứ tự toàn cục.",
        "Tách giao diện include giữa thư mục dựng dự án (build tree) và thư mục cài đặt (install tree).",
        "Kiểm thử tái lập được cho quá trình dựng sạch, tăng dần, song song và sau đóng gói.",
      ],
    },
  }),
  pack({
    id: "scripting-reconciliation",
    competency: "scripting_automation",
    title: "Python, Perl và đối soát",
    summary:
      "Tự động hóa dùng bộ nhớ có giới hạn, có thể tiếp tục và thay thế tập lệnh cũ an toàn.",
    conceptIds: [
      "scripting-python-data",
      "scripting-perl-legacy",
      "scripting-reconciliation",
    ],
    sourceLabel: "Kho bài học Python",
    sourceHref: "/?deck=python-interview",
    practice: {
      title: "Tạo báo cáo đối chiếu theo luồng",
      kind: "implement",
      language: "python",
      estimatedMinutes: 17,
      prompt:
        "Thiết kế công cụ Python so sánh hai tệp dữ liệu theo khoảng thời gian đã sắp xếp theo khóa mà không nạp toàn bộ vào RAM. Báo cáo chênh lệch có ngưỡng sai số theo trường, mã tiếp tục và mã thoát dùng được trong CI.",
      starterCode: `def compare_streams(legacy_path, modern_path, policy):
    # TODO: bounded-memory merge and report
    pass`,
      followUps: [
        "Nếu một bên thiếu khóa, vị trí đọc của hai luồng tiến thế nào?",
        "Bạn kiểm thử NaN, số không có dấu âm và ranh giới dấu thời gian ra sao?",
      ],
      rubric: [
        "Dùng phép gộp theo luồng với bộ nhớ có giới hạn.",
        "Phân biệt hàng bị thiếu và trường bị chênh lệch.",
        "Chính sách ngưỡng sai số rõ ràng và có phiên bản.",
        "Ngữ nghĩa tiếp tục, kiểm toán và mã thoát CI rõ ràng.",
      ],
    },
    checkpoint: {
      title: "Thay thế tác vụ bù dữ liệu Perl thiếu ổn định",
      kind: "design",
      language: "python",
      estimatedMinutes: 18,
      prompt:
        "Một tập lệnh Perl chưa có kiểm thử đang bù dữ liệu cho các tập dữ liệu thực tế. Hãy lập kế hoạch tìm hiểu hành vi, viết kiểm thử ghi nhận hành vi hiện tại, thay bằng Python, chạy đối chiếu hai phiên bản và chuyển đổi chính thức mà không mất lịch sử kiểm toán.",
      starterCode: null,
      followUps: [
        "Hành vi nào phải giữ dù mã nguồn có vẻ sai?",
        "Nếu chạy đối chiếu hai phiên bản quá tốn kém, bạn chọn mẫu và cổng kiểm soát rủi ro thế nào?",
      ],
      rubric: [
        "Mô tả hành vi hiện tại trước khi viết lại.",
        "Bộ dữ liệu chuẩn và trường hợp biên có nguồn rõ ràng.",
        "Chiến lược chạy đối chiếu/lấy mẫu định lượng được rủi ro.",
        "Chuyển đổi chính thức, quay lui và trách nhiệm kiểm toán rõ ràng.",
      ],
    },
    checkpointRetry: {
      title: "Xây tác vụ chuyển đổi có thể tiếp tục an toàn sau sự cố",
      kind: "implement",
      language: "python",
      estimatedMinutes: 18,
      prompt:
        "Một tác vụ chuyển đổi Python viết lại hàng nghìn tệp nén hằng ngày theo schema mới và có thể bị dừng ở bất kỳ lúc nào. Hãy thiết kế xử lý với bộ nhớ có giới hạn, công bố nguyên tử, điểm kiểm tra có thể tiếp tục và bản kê kiểm toán để lần chạy lại không trộn đầu ra dở dang với đầu ra hoàn tất.",
      starterCode: `def migrate_file(source, destination, checkpoint_store):
    # TODO: xử lý theo luồng, kiểm tra và công bố nguyên tử
    pass`,
      followUps: [
        "Bạn tiếp tục an toàn thế nào khi tiến trình dừng sau lúc đổi tên nhưng trước khi ghi nhận điểm kiểm tra?",
        "Bạn xử lý song song theo ngày thế nào để hai tiến trình không công bố cùng một đầu ra?",
      ],
      rubric: [
        "Xử lý bản ghi theo luồng mà không nạp cả ngày vào bộ nhớ.",
        "Dùng đầu ra tạm, kiểm tra hợp lệ và công bố nguyên tử.",
        "Bảo đảm điểm kiểm tra và định danh đầu ra có tính lặp an toàn trong mọi khoảng xảy ra sự cố.",
        "Xác định quyền sở hữu tiến trình, siêu dữ liệu kiểm toán, báo lỗi và dọn dẹp.",
      ],
    },
  }),
  pack({
    id: "ownership-communication",
    competency: "ownership_communication",
    title: "Chủ động phối hợp với nhà nghiên cứu",
    summary:
      "Làm rõ yêu cầu, điều tra sự cố và giao tiếp bằng tiếng Anh khi làm việc khác múi giờ.",
    conceptIds: [
      "ownership-requirements",
      "ownership-incidents",
      "ownership-english",
    ],
    sourceLabel: "Năng lực theo mô tả công việc WorldQuant",
    sourceHref: "/worldquant",
    practice: {
      title: "Xử lý yêu cầu thay đổi còn mơ hồ",
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
      title: "Bảo vệ kế hoạch chuyển đổi chính thức có rủi ro bằng tiếng Anh",
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
      title: "Bàn giao sự cố giữa các múi giờ",
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

function buildWorldQuantDrillAssessmentManifest(
  packs: readonly WorldQuantDrillAssessmentPackDescriptor[],
) {
  return new Map<string, WorldQuantDrillAssessmentDescriptor>(
    packs.flatMap((packDescriptor) => [
      [
        `${packDescriptor.id}-practice`,
        {
          id: `${packDescriptor.id}-practice`,
          variant: "practice" as const,
          competency: packDescriptor.competency,
          conceptIds: packDescriptor.conceptIds,
          rubricTotal: packDescriptor.rubricTotals[0],
        },
      ],
      [
        `${packDescriptor.id}-checkpoint`,
        {
          id: `${packDescriptor.id}-checkpoint`,
          variant: "checkpoint" as const,
          competency: packDescriptor.competency,
          conceptIds: packDescriptor.conceptIds,
          rubricTotal: packDescriptor.rubricTotals[1],
        },
      ],
      [
        `${packDescriptor.id}-checkpoint-retry`,
        {
          id: `${packDescriptor.id}-checkpoint-retry`,
          variant: "checkpoint" as const,
          competency: packDescriptor.competency,
          conceptIds: packDescriptor.conceptIds,
          rubricTotal: packDescriptor.rubricTotals[2],
        },
      ],
    ]),
  );
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
    version: WORLDQUANT_DRILL_CATALOG_VERSION,
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
    version: WORLDQUANT_DRILL_CATALOG_VERSION,
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
