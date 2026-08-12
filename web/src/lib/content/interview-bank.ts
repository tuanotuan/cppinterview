import type { ContentQuestion } from "./schema";

export const interviewQuestionCategories = [
  "language_knowledge",
  "code_reading_ub",
  "coding",
  "code_review_debug",
  "design_performance",
  "communication_ownership",
] as const;

export type InterviewQuestionCategory =
  (typeof interviewQuestionCategories)[number];

export type CodeTestSuiteMetadata = {
  specRevision: number;
  publicTestCount: number;
  hiddenTestCount: number;
};

export const interviewQuestionCategoryLabels: Record<
  InterviewQuestionCategory,
  string
> = {
  language_knowledge: "Kiến thức ngôn ngữ",
  code_reading_ub: "Đọc mã, dự đoán và UB",
  coding: "Viết mã",
  code_review_debug: "Code review và debug",
  design_performance: "Thiết kế và hiệu năng",
  communication_ownership: "Giao tiếp và ownership",
};

export const interviewQuestionBankTargets: ReadonlyArray<{
  category: InterviewQuestionCategory;
  target: number;
  description: string;
}> = [
  {
    category: "language_knowledge",
    target: 100,
    description: "C++ core, modern C++, STL, object model và ngôn ngữ.",
  },
  {
    category: "code_reading_ub",
    target: 80,
    description: "Đọc mã, dự đoán hành vi, lifetime, undefined behavior và bẫy.",
  },
  {
    category: "coding",
    target: 60,
    description: "Viết hoặc hoàn thiện mã với test công khai và test ẩn phía máy chủ.",
  },
  {
    category: "code_review_debug",
    target: 30,
    description: "Tìm lỗi, review thay đổi và đề xuất cách sửa an toàn.",
  },
  {
    category: "design_performance",
    target: 20,
    description: "Thiết kế API/hệ thống và phân tích trade-off hiệu năng.",
  },
  {
    category: "communication_ownership",
    target: 10,
    description: "Làm rõ yêu cầu, phối hợp, incident và tinh thần ownership.",
  },
] as const;

export const INTERVIEW_QUESTION_BANK_TARGET = interviewQuestionBankTargets.reduce(
  (total, item) => total + item.target,
  0,
);

type QuestionForClassification = Pick<
  ContentQuestion,
  "type" | "responseMode" | "taxonomy"
> & {
  interviewCategory?: InterviewQuestionCategory;
  assessmentSkills?: string[];
  codeTestSuite?: CodeTestSuiteMetadata;
  status?: ContentQuestion["status"];
  sources?: ContentQuestion["sources"];
  rubric?: ContentQuestion["rubric"];
  answer?: ContentQuestion["answer"];
};

export function resolveInterviewQuestionCategory(
  question: QuestionForClassification,
): InterviewQuestionCategory {
  const explicit =
    question.interviewCategory ?? question.taxonomy?.interviewCategory;
  if (explicit) return explicit;

  if (question.responseMode === "code") return "coding";
  if (question.type === "recall") return "language_knowledge";
  if (question.type === "code_reasoning" || question.type === "pitfall") {
    return "code_reading_ub";
  }
  return "design_performance";
}

export function questionAssessmentSkills(question: QuestionForClassification) {
  const explicit = question.assessmentSkills ?? question.taxonomy?.assessmentSkills;
  return [...new Set(explicit?.length ? explicit : question.taxonomy.topics)].sort();
}

export function questionVerificationGaps(question: QuestionForClassification) {
  const gaps: string[] = [];
  if (!question.sources?.length) gaps.push("thiếu nguồn hoặc editorial");
  if (!question.rubric?.required.length) gaps.push("thiếu tiêu chí chấm");
  if (!question.answer?.short.trim() || !question.answer.detailed.trim()) {
    gaps.push("thiếu đáp án tham khảo");
  }

  if (question.responseMode === "code") {
    const suite = question.codeTestSuite ?? question.taxonomy?.codeTestSuite;
    if (!suite) {
      gaps.push("thiếu test suite phía máy chủ");
    } else {
      if (suite.publicTestCount < 1) gaps.push("thiếu test công khai");
      if (suite.hiddenTestCount < 1) gaps.push("thiếu test ẩn");
    }
  }
  return gaps;
}

export type InterviewBankSummary = {
  target: number;
  verified: number;
  draft: number;
  needsReview: number;
  codeTestReady: number;
  categories: Array<{
    category: InterviewQuestionCategory;
    target: number;
    total: number;
    verified: number;
    draft: number;
    needsReview: number;
    codeTestReady: number;
    remaining: number;
  }>;
};

export function summarizeInterviewQuestionBank(
  questions: readonly QuestionForClassification[],
): InterviewBankSummary {
  const active = questions.filter(
    (question) =>
      question.status !== "archived" &&
      question.taxonomy.deckId === "cpp-interview",
  );
  const categories = interviewQuestionBankTargets.map((definition) => {
    const matching = active.filter(
      (question) =>
        resolveInterviewQuestionCategory(question) === definition.category,
    );
    const verified = matching.filter(
      (question) =>
        question.status === "verified" && questionVerificationGaps(question).length === 0,
    ).length;
    const draft = matching.filter((question) => question.status === "draft").length;
    const needsReview = matching.filter(
      (question) => question.status === "needs_review",
    ).length;
    const codeTestReady = matching.filter((question) => {
      const suite = question.codeTestSuite ?? question.taxonomy?.codeTestSuite;
      return (
        question.responseMode === "code" &&
        suite !== undefined &&
        suite.publicTestCount > 0 &&
        suite.hiddenTestCount > 0
      );
    }).length;

    return {
      category: definition.category,
      target: definition.target,
      total: matching.length,
      verified,
      draft,
      needsReview,
      codeTestReady,
      remaining: Math.max(0, definition.target - verified),
    };
  });

  return {
    target: INTERVIEW_QUESTION_BANK_TARGET,
    verified: categories.reduce((total, item) => total + item.verified, 0),
    draft: categories.reduce((total, item) => total + item.draft, 0),
    needsReview: categories.reduce((total, item) => total + item.needsReview, 0),
    codeTestReady: categories.reduce((total, item) => total + item.codeTestReady, 0),
    categories,
  };
}

export function planDraftCategories({
  questions,
  count,
}: {
  questions: readonly QuestionForClassification[];
  count: number;
}): InterviewQuestionCategory[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Draft count must be a positive integer");
  }
  const summary = summarizeInterviewQuestionBank(questions);
  const byPriority = [...summary.categories].sort(
    (left, right) =>
      right.remaining - left.remaining || left.category.localeCompare(right.category),
  );
  return Array.from(
    { length: count },
    (_, index) => byPriority[index % byPriority.length]!.category,
  );
}
