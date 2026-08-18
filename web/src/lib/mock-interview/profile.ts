import type {
  ContentLanguage,
  ContentTrack,
} from "@/lib/content/schema";

export const WORLDQUANT_PROFILE_ID = "worldquant-tick-data-engineer" as const;
export const WORLDQUANT_PROFILE_VERSION = 4 as const;

export const mockCompetencyKeys = [
  "modern_cpp",
  "tick_data_order_book",
  "data_pipeline_performance",
  "engineering_quality",
  "scripting",
  "communication_ownership",
] as const;

export type MockCompetencyKey = (typeof mockCompetencyKeys)[number];
export type MockQuestionOrigin = "question_bank" | "role_profile";
export type MockInterviewDuration = 30 | 45 | 60;

export function parseMockInterviewDuration(
  value: string | number | undefined,
): MockInterviewDuration {
  const parsed = Number(value);
  return parsed === 30 || parsed === 45 || parsed === 60
    ? parsed
    : 45;
}

export const mockInterviewSetIds = [
  "worldquant-30-a",
  "worldquant-30-b",
  "worldquant-45-a",
  "worldquant-45-b",
  "worldquant-60-a",
  "worldquant-60-b",
] as const;
export type MockInterviewSetId = (typeof mockInterviewSetIds)[number];

export type MockInterviewQuestion = {
  id: string;
  origin: MockQuestionOrigin;
  version: number;
  contentRevision: string;
  prompt: string;
  code?: string;
  language: ContentLanguage;
  track: ContentTrack;
  responseMode: "text" | "code";
  execution?: {
    specRevision: number;
  };
  estimatedMinutes: number;
  competency: MockCompetencyKey;
  selectionTopics: string[];
};

export type MockInterviewSet = {
  id: MockInterviewSetId;
  version: number;
  durationMinutes: MockInterviewDuration;
  number: 1 | 2;
  questionIds: readonly string[];
};

export const mockDurationQuestionCounts: Record<
  MockInterviewDuration,
  number
> = {
  30: 4,
  45: 5,
  60: 7,
};

export const mockCompetencyLabels: Record<MockCompetencyKey, string> = {
  modern_cpp: "C++ hiện đại",
  tick_data_order_book: "Dữ liệu tick và sổ lệnh",
  data_pipeline_performance: "Luồng dữ liệu và hiệu năng",
  engineering_quality: "Kiểm thử và phát hành C++",
  scripting: "Công cụ dữ liệu C++",
  communication_ownership: "Tinh thần làm chủ và giao tiếp",
};

export const WORLDQUANT_PROFILE = {
  id: WORLDQUANT_PROFILE_ID,
  version: WORLDQUANT_PROFILE_VERSION,
  company: "WorldQuant",
  role: "Kỹ sư nền tảng dữ liệu tick bằng C++ hiện đại",
  badge: "WQ",
  disclaimer:
    "Bộ phỏng vấn thử được tạo từ mô tả công việc và ngân hàng câu hỏi riêng; đây không phải câu hỏi nội bộ hay tài liệu tuyển dụng chính thức của WorldQuant.",
  focus: [
    "C++11–23, vòng đời, quyền sở hữu, tính đúng đắn và hiệu năng",
    "Luồng dữ liệu tick, dữ liệu sổ lệnh, đặc trưng và thống kê theo khoảng thời gian",
    "Chuyển đổi hệ thống cũ, đối chiếu dữ liệu, chuyển đổi chính thức và khôi phục",
    "Kiểm thử, CI/CD, Git và chất lượng phần mềm C++",
    "Tinh thần làm chủ sản phẩm và phối hợp với nhóm nghiên cứu",
  ],
  competencies: [
    { key: "modern_cpp", weight: 30 },
    { key: "tick_data_order_book", weight: 25 },
    { key: "data_pipeline_performance", weight: 15 },
    { key: "engineering_quality", weight: 15 },
    { key: "scripting", weight: 5 },
    { key: "communication_ownership", weight: 10 },
  ] satisfies Array<{ key: MockCompetencyKey; weight: number }>,
} as const;

const ROLE_CONTENT_REVISION = "worldquant-jd-2025-v2";

export const WORLDQUANT_ROLE_QUESTIONS: MockInterviewQuestion[] = [
  {
    id: "worldquant-tick-feed-correctness",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 7,
    competency: "tick_data_order_book",
    selectionTopics: [
      "tick-data",
      "order-book",
      "sequencing",
      "determinism",
    ],
    prompt:
      "Một luồng dữ liệu tick mới có số thứ tự (sequence number), nhưng đôi lúc gửi bản ghi trùng lặp, thiếu số thứ tự hoặc gửi thông điệp sai thứ tự. Hãy thiết kế luồng tiếp nhận và chuẩn hóa để các đặc trưng, thống kê theo khoảng thời gian ở phía sau cùng trạng thái sổ lệnh vẫn cho kết quả xác định. Bạn sẽ xử lý ảnh chụp trạng thái (snapshot), phát lại dữ liệu (replay) và giám sát chất lượng dữ liệu như thế nào?",
  },
  {
    id: "worldquant-interval-stats-cpp",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "code",
    execution: { specRevision: 1 },
    estimatedMinutes: 10,
    competency: "data_pipeline_performance",
    selectionTopics: [
      "tick-data",
      "interval-statistics",
      "vwap",
      "performance",
    ],
    prompt:
      "Cài đặt phần còn thiếu cho bộ thống kê của một khoảng dữ liệu tick. Sau phần mã, hãy giải thích độ phức tạp, cách xử lý tick không hợp lệ, độ chính xác và nguy cơ tràn số trong môi trường thực tế.",
    code: `#include <cstdint>
#include <optional>

struct Tick {
    std::int64_t timestamp_ns;
    double price;
    std::int64_t quantity;
};

struct IntervalStats {
    std::uint64_t tick_count{};
    std::int64_t volume{};
    long double turnover{};
    std::optional<double> open;
    std::optional<double> high;
    std::optional<double> low;
    std::optional<double> close;

    void on_tick(const Tick& tick);
    [[nodiscard]] std::optional<double> vwap() const;
};`,
  },
  {
    id: "worldquant-legacy-migration",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 7,
    competency: "communication_ownership",
    selectionTopics: [
      "legacy-migration",
      "data-parity",
      "cutover",
      "product-ownership",
    ],
    prompt:
      "Bạn cần chuyển nhiều năm dữ liệu tick từ nền tảng C++ cũ sang nền tảng mới, trong khi nhóm nghiên cứu vẫn dùng kết quả cũ để tạo tín hiệu. Hãy trình bày kế hoạch chuyển đổi, cách chứng minh hai hệ thống cho kết quả tương đương, cách bổ sung dữ liệu lịch sử, chuyển đổi chính thức hoặc khôi phục, và cách phối hợp với bộ phận Nghiên cứu cùng Quản lý danh mục.",
  },
  {
    id: "worldquant-cpp-delivery-safety",
    origin: "role_profile",
    version: 3,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 7,
    competency: "engineering_quality",
    selectionTopics: [
      "testing",
      "ci-cd",
      "reproducible-build",
    ],
    prompt:
      "Một thay đổi ở bộ giải mã C++ cho feed mới sắp được phát hành. Hãy mô tả cách bạn thiết kế kiểm thử đơn vị, kiểm thử dữ liệu golden, sanitizer, benchmark và cổng CI để phát hiện lỗi định dạng, lỗi vòng đời hoặc suy giảm hiệu năng trước khi phát hành. Nêu rõ bằng chứng nào cần lưu để có thể phát lại một lỗi production.",
  },
  {
    id: "worldquant-cpp-reconciliation",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 7,
    competency: "data_pipeline_performance",
    selectionTopics: [
      "cpp",
      "reconciliation",
      "streaming-data",
      "automation",
    ],
    prompt:
      "Thiết kế một công cụ C++ đối chiếu kết quả tick và khoảng thời gian giữa hệ thống cũ với nền tảng mới trên tập dữ liệu rất lớn. Hãy nêu mô hình dữ liệu, cách đọc theo luồng, ngưỡng sai số, cách báo cáo khác biệt, khả năng tiếp tục sau gián đoạn và cách đưa công cụ vào CI hoặc quy trình chuyển đổi.",
  },
  {
    id: "worldquant-researcher-collaboration",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 5,
    competency: "communication_ownership",
    selectionTopics: [
      "behavioral",
      "requirements",
      "cross-timezone",
      "english",
    ],
    prompt:
      "Trả lời bằng tiếng Anh: A researcher reports that one interval feature changed after migration, but the requirement is ambiguous and the owner is in another time zone. Walk the interviewer through how you would investigate, communicate risk, agree on expected behavior, and own the resolution.",
  },
  {
    id: "worldquant-order-book-update-cpp",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "code",
    execution: { specRevision: 1 },
    estimatedMinutes: 10,
    competency: "tick_data_order_book",
    selectionTopics: [
      "order-book",
      "sequencing",
      "fixed-point",
      "correctness",
    ],
    prompt:
      "Hoàn thiện phần lõi của sổ lệnh L2 dưới đây. `apply` phải xử lý bản cập nhật trùng lặp, thiếu số thứ tự, thêm, sửa hoặc xóa mức giá mà không làm hỏng trạng thái. Sau phần mã, hãy giải thích các bất biến, độ phức tạp và cách đồng bộ lại khi mất số thứ tự.",
    code: `#include <cstdint>
#include <functional>
#include <map>

enum class Side { bid, ask };

struct LevelUpdate {
    std::uint64_t sequence;
    Side side;
    std::int64_t price_ticks;
    std::int64_t quantity; // 0 nghĩa là xóa
};

class OrderBook {
public:
    // Trả về false khi không thể áp dụng cập nhật một cách an toàn.
    bool apply(const LevelUpdate& update);

private:
    std::uint64_t last_sequence_{};
    std::map<std::int64_t, std::int64_t, std::greater<>> bids_;
    std::map<std::int64_t, std::int64_t> asks_;
};`,
  },
  {
    id: "worldquant-cpp-event-lifetime",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "code",
    estimatedMinutes: 7,
    competency: "modern_cpp",
    selectionTopics: [
      "lifetime",
      "ownership",
      "string-view",
      "span",
    ],
    prompt:
      "Đoạn mã giải mã sự kiện thị trường dưới đây có lỗi vòng đời. Hãy chỉ ra vì sao view trỏ vào dữ liệu đã hết vòng đời (dangling view) và viết lại API để bên gọi hiểu rõ quyền sở hữu, đồng thời hạn chế sao chép trên luồng xử lý cần hiệu năng cao (hot path). Giải thích khi nào thiết kế không sao chép (zero-copy) vẫn hợp lệ.",
    code: `#include <cstddef>
#include <span>
#include <string_view>
#include <vector>

struct DecodedEvent {
    std::string_view symbol;
    std::span<const std::byte> payload;
};

DecodedEvent decode(std::vector<std::byte> packet) {
    // Giả sử các byte đầu chứa mã giao dịch, sau đó là dữ liệu.
    return {
        std::string_view(
            reinterpret_cast<const char*>(packet.data()), 4),
        std::span<const std::byte>(packet).subspan(4)
    };
}`,
  },
  {
    id: "worldquant-partitioned-pipeline-backpressure",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 8,
    competency: "data_pipeline_performance",
    selectionTopics: [
      "concurrency",
      "partitioning",
      "backpressure",
      "hot-key",
    ],
    prompt:
      "Một quy trình xử lý dữ liệu tick cần mở rộng qua nhiều worker (luồng hoặc tiến trình xử lý) nhưng vẫn giữ đúng thứ tự theo từng mã giao dịch. Hãy thiết kế cách phân vùng, hàng đợi có giới hạn và cơ chế buộc nguồn gửi chậm lại khi hệ thống quá tải (backpressure). Bạn sẽ xử lý mã giao dịch quá tải, lỗi worker, dừng hệ thống và đo độ trễ cùng thông lượng ra sao để tối ưu mà vẫn bảo đảm tính đúng đắn?",
  },
  {
    id: "worldquant-feed-regression-testing",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 7,
    competency: "engineering_quality",
    selectionTopics: [
      "testing",
      "ci-cd",
      "golden-data",
      "benchmark",
    ],
    prompt:
      "Bạn sắp hợp nhất bộ giải mã cho một luồng dữ liệu tick mới. Hãy thiết kế kim tự tháp kiểm thử và các điều kiện kiểm soát CI để phát hiện gói tin sai định dạng, thiếu số thứ tự, ranh giới múi giờ hoặc phiên giao dịch, sai lệch số học và suy giảm hiệu năng. Những dữ liệu và tệp kết quả nào cần được quản lý phiên bản để có thể phát lại chính xác lỗi ở môi trường thực tế?",
  },
  {
    id: "worldquant-cpp-sequence-audit",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 8,
    competency: "tick_data_order_book",
    selectionTopics: [
      "cpp",
      "streaming-data",
      "sequencing",
      "audit",
    ],
    prompt:
      "Thiết kế API C++ xử lý theo luồng để phát hiện bản ghi trùng lặp, thiếu số thứ tự và sai thứ tự riêng cho từng cặp feed/instrument mà không nạp toàn bộ tệp. Hãy nêu cấu trúc dữ liệu, giới hạn bộ nhớ, giả định về thứ tự đầu vào và cách tiếp tục một tác vụ dài sau khi bị gián đoạn.",
  },
  {
    id: "worldquant-cpp-feed-api-evolution",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 6,
    competency: "modern_cpp",
    selectionTopics: [
      "api-design",
      "value-semantics",
      "compatibility",
      "modern-cpp",
    ],
    prompt:
      "Nền tảng phải hỗ trợ thêm nhiều luồng dữ liệu, trong khi một số thành phần cũ vẫn được biên dịch bằng C++11 và nền tảng mới dùng C++20/23. Hãy thiết kế ranh giới và API giữa bộ giải mã với mô hình tick đã chuẩn hóa: quyền sở hữu, xử lý lỗi, quản lý phiên bản ABI và cách phát hành dần để thêm luồng mới mà không buộc biên dịch lại hoặc sửa toàn hệ thống.",
  },
  {
    id: "worldquant-production-data-incident",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 6,
    competency: "communication_ownership",
    selectionTopics: [
      "incident-response",
      "data-quality",
      "risk",
      "ownership",
    ],
    prompt:
      "Trả lời bằng tiếng Anh: Ten minutes before market open, monitoring shows stale prices for one venue after a deployment. Researchers are waiting for data and the feed owner is offline. Explain your first 30 minutes: how you contain risk, choose rollback or forward-fix, communicate status, preserve evidence, and close the incident.",
  },
  {
    id: "worldquant-parallel-replay-determinism",
    origin: "role_profile",
    version: 2,
    contentRevision: ROLE_CONTENT_REVISION,
    language: "cpp",
    track: "cpp20",
    responseMode: "text",
    estimatedMinutes: 7,
    competency: "data_pipeline_performance",
    selectionTopics: [
      "parallelism",
      "determinism",
      "replay",
      "floating-point",
    ],
    prompt:
      "Việc phát lại dữ liệu lịch sử hiện chỉ chạy trên một luồng và quá chậm. Bạn sẽ song song hóa theo ngày, địa điểm giao dịch hoặc mã giao dịch như thế nào để kết quả thống kê theo khoảng thời gian vẫn xác định và tương đương với hệ thống cũ? Hãy thảo luận về thứ tự, cách gộp kết quả, số dấu phẩy động, bộ nhớ, điểm lưu trạng thái và phương pháp đo hiệu năng.",
  },
];

const curatedById = new Map(
  WORLDQUANT_ROLE_QUESTIONS.map((question) => [question.id, question]),
);

const familyAQuestionIds = [
  "worldquant-tick-feed-correctness",
  "worldquant-cpp-feed-api-evolution",
  "worldquant-interval-stats-cpp",
  "worldquant-legacy-migration",
  "worldquant-cpp-delivery-safety",
  "worldquant-cpp-reconciliation",
  "worldquant-researcher-collaboration",
] as const;

const familyBQuestionIds = [
  "worldquant-order-book-update-cpp",
  "worldquant-cpp-event-lifetime",
  "worldquant-parallel-replay-determinism",
  "worldquant-production-data-incident",
  "worldquant-feed-regression-testing",
  "worldquant-cpp-sequence-audit",
  "worldquant-partitioned-pipeline-backpressure",
] as const;

export const WORLDQUANT_MOCK_SETS = [
  {
    id: "worldquant-30-a",
    version: 2,
    durationMinutes: 30,
    number: 1,
    questionIds: familyAQuestionIds.slice(0, 4),
  },
  {
    id: "worldquant-30-b",
    version: 2,
    durationMinutes: 30,
    number: 2,
    questionIds: familyBQuestionIds.slice(0, 4),
  },
  {
    id: "worldquant-45-a",
    version: 2,
    durationMinutes: 45,
    number: 1,
    questionIds: familyAQuestionIds.slice(0, 5),
  },
  {
    id: "worldquant-45-b",
    version: 2,
    durationMinutes: 45,
    number: 2,
    questionIds: familyBQuestionIds.slice(0, 5),
  },
  {
    id: "worldquant-60-a",
    version: 2,
    durationMinutes: 60,
    number: 1,
    questionIds: familyAQuestionIds,
  },
  {
    id: "worldquant-60-b",
    version: 2,
    durationMinutes: 60,
    number: 2,
    questionIds: familyBQuestionIds,
  },
] as const satisfies readonly MockInterviewSet[];

const mockSetById = new Map(
  WORLDQUANT_MOCK_SETS.map((mockSet) => [mockSet.id, mockSet]),
);

export function worldQuantMockSetsForDuration(
  durationMinutes: MockInterviewDuration,
) {
  return WORLDQUANT_MOCK_SETS.filter(
    (mockSet) => mockSet.durationMinutes === durationMinutes,
  );
}

export function worldQuantMockSetById(setId: MockInterviewSetId) {
  return mockSetById.get(setId);
}

export function matchesWorldQuantMockSet({
  setId,
  setVersion,
  durationMinutes,
  questionIds,
}: {
  setId: MockInterviewSetId;
  setVersion: number;
  durationMinutes: MockInterviewDuration;
  questionIds: readonly string[];
}) {
  const mockSet = worldQuantMockSetById(setId);
  return Boolean(
    mockSet &&
      mockSet.version === setVersion &&
      mockSet.durationMinutes === durationMinutes &&
      mockSet.questionIds.length === questionIds.length &&
      mockSet.questionIds.every(
        (questionId, index) => questionId === questionIds[index],
      ),
  );
}

const performanceTopics = new Set([
  "alignment",
  "algorithm",
  "array",
  "bounds",
  "cache",
  "compile-time",
  "container",
  "iteration",
  "lifetime",
  "memory",
  "object-model",
  "ownership",
  "performance",
  "pointer",
  "reference",
  "special-member-function",
  "type-deduction",
]);

const tickTopics = new Set([
  "feed",
  "interval-statistics",
  "market-data",
  "order-book",
  "sequencing",
  "tick-data",
]);

const qualityTopics = new Set([
  "ci-cd",
  "debugging",
  "testing",
]);

export function inferMockCompetency({
  language: _language,
  topics,
}: {
  language: ContentLanguage;
  topics: string[];
}): MockCompetencyKey {
  void _language;
  if (topics.some((topic) => tickTopics.has(topic))) {
    return "tick_data_order_book";
  }
  if (topics.some((topic) => qualityTopics.has(topic))) {
    return "engineering_quality";
  }
  if (topics.some((topic) => performanceTopics.has(topic))) {
    return "data_pipeline_performance";
  }
  return "modern_cpp";
}

export function selectWorldQuantQuestions({
  setId,
}: {
  setId: MockInterviewSetId;
}): MockInterviewQuestion[] {
  const mockSet = worldQuantMockSetById(setId);
  if (!mockSet) throw new Error(`Unknown mock interview set: ${setId}`);
  return mockSet.questionIds.map((questionId) => {
    const question = curatedById.get(questionId);
    if (!question) {
      throw new Error(`${setId} references an unknown question: ${questionId}`);
    }
    return question;
  });
}

export function buildWorldQuantGroundingCoverage(
  bankQuestions: MockInterviewQuestion[],
) {
  const counts = Object.fromEntries(
    mockCompetencyKeys.map((key) => [key, 0]),
  ) as Record<MockCompetencyKey, number>;
  for (const question of bankQuestions) counts[question.competency] += 1;

  return {
    counts,
    groundedCompetencies: mockCompetencyKeys.filter((key) => counts[key] > 0),
    missingCompetencies: mockCompetencyKeys.filter((key) => counts[key] === 0),
  };
}

for (const mockSet of WORLDQUANT_MOCK_SETS) {
  if (
    mockSet.questionIds.length !==
    mockDurationQuestionCounts[mockSet.durationMinutes]
  ) {
    throw new Error(`${mockSet.id} has the wrong question count`);
  }
  if (new Set(mockSet.questionIds).size !== mockSet.questionIds.length) {
    throw new Error(`${mockSet.id} contains duplicate questions`);
  }
  for (const questionId of mockSet.questionIds) {
    if (!curatedById.has(questionId)) {
      throw new Error(`${mockSet.id} references unknown question ${questionId}`);
    }
  }
}
