import type {
  InterviewQuestionCategory,
  InterviewQuestionFormat,
} from "./schema";

type InterviewFormatDefinition = {
  category: InterviewQuestionCategory;
  label: string;
  generatorInstruction: string;
};

// These are intentionally internal metadata. A learner sees the task itself,
// not a taxonomy chip that reveals the expected angle before answering.
export const interviewFormatDefinitions: Record<
  InterviewQuestionFormat,
  InterviewFormatDefinition
> = {
  concept_explanation: {
    category: "language_knowledge",
    label: "Giải thích khái niệm",
    generatorInstruction:
      "Yêu cầu giải thích một khái niệm C++ bằng ngôn ngữ phỏng vấn, nêu điều kiện áp dụng và một bẫy thường gặp.",
  },
  bug_hunt: {
    category: "code_review_debug",
    label: "Tìm lỗi trong đoạn mã",
    generatorInstruction:
      "Đưa một đoạn mã ngắn có lỗi thực tế; yêu cầu chỉ ra lỗi, tác động và cách sửa an toàn.",
  },
  crash_memory_leak: {
    category: "code_review_debug",
    label: "Sửa crash hoặc memory leak",
    generatorInstruction:
      "Đưa tình huống có nguy cơ crash, dangling pointer hoặc memory leak; yêu cầu ưu tiên sửa đúng trước khi tối ưu.",
  },
  undefined_behavior: {
    category: "code_reading_ub",
    label: "Tìm undefined behavior",
    generatorInstruction:
      "Đưa đoạn mã có undefined behavior hoặc rủi ro lifetime/bounds; yêu cầu nêu điều kiện gây lỗi và bản sửa xác định.",
  },
  api_class_review: {
    category: "code_review_debug",
    label: "Review API hoặc class",
    generatorInstruction:
      "Đưa API/class nhỏ; yêu cầu review theo ownership, const-correctness, invariants, error handling và khả năng dùng sai.",
  },
  implementation_comparison: {
    category: "design_performance",
    label: "So sánh hai implementation",
    generatorInstruction:
      "Đưa hai implementation cùng mục tiêu; yêu cầu so sánh correctness, complexity, lifetime/ownership và trade-off vận hành.",
  },
  correctness_preserving_optimization: {
    category: "design_performance",
    label: "Tối ưu nhưng giữ correctness",
    generatorInstruction:
      "Đưa một bottleneck cụ thể; yêu cầu đề xuất tối ưu kèm bất biến correctness, cách đo và test chống regression.",
  },
  compiler_diagnostic: {
    category: "code_review_debug",
    label: "Giải thích lỗi compiler",
    generatorInstruction:
      "Đưa mã và compiler diagnostic ngắn; yêu cầu giải thích nguyên nhân gốc, sửa tối thiểu và vì sao bản sửa compile.",
  },
  ownership_lifetime_design: {
    category: "design_performance",
    label: "Thiết kế ownership và lifetime",
    generatorInstruction:
      "Đưa ranh giới ownership/lifetime thực tế; yêu cầu thiết kế API và nói rõ ai sở hữu gì, ai được mượn gì và điều kiện hợp lệ.",
  },
  test_first_debugging: {
    category: "code_review_debug",
    label: "Viết test trước khi sửa",
    generatorInstruction:
      "Đưa bug có thể tái hiện; yêu cầu thiết kế test tái hiện trước, sau đó nêu bản sửa và các edge case giữ lại.",
  },
  code_review: {
    category: "code_review_debug",
    label: "Code review theo dòng",
    generatorInstruction:
      "Bắt buộc có trường code. Yêu cầu ứng viên để lại nhận xét theo dòng: vấn đề, tác động, rồi đề xuất sửa. Dùng responseMode text.",
  },
  ownership_communication: {
    category: "communication_ownership",
    label: "Trao đổi ownership và trách nhiệm",
    generatorInstruction:
      "Đưa tình huống phối hợp kỹ thuật có ownership; yêu cầu làm rõ rủi ro, kế hoạch giao tiếp và cách theo dõi kết quả.",
  },
};

export const interviewQuestionFormats = Object.keys(
  interviewFormatDefinitions,
) as InterviewQuestionFormat[];

export const interviewQuestionFormatLabels = Object.fromEntries(
  interviewQuestionFormats.map((format) => [
    format,
    interviewFormatDefinitions[format].label,
  ]),
) as Record<InterviewQuestionFormat, string>;

export function categoryForInterviewFormat(format: InterviewQuestionFormat) {
  return interviewFormatDefinitions[format].category;
}

export function draftFormatsForCategories(
  categories: readonly InterviewQuestionCategory[],
  count: number,
) {
  const allowed = interviewQuestionFormats.filter((format) =>
    categories.includes(categoryForInterviewFormat(format)),
  );
  const pool = allowed.length ? allowed : interviewQuestionFormats;
  return Array.from({ length: count }, (_, index) => pool[index % pool.length]!);
}
