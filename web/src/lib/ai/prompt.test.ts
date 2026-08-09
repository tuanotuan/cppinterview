import { describe, expect, it } from "vitest";

import manifestJson from "../../generated/content-manifest.json";
import { contentManifestSchema } from "../content/schema";

import {
  coachFeedbackSchema,
  coachFollowUpRequestSchema,
  coachRequestSchema,
  normalizeCoachFeedback,
  questionClarificationSchema,
  type CoachFeedback,
} from "./contracts";
import {
  buildCoachFollowUpPrompt,
  buildCoachPrompt,
  buildCoachSystemInstruction,
  buildQuestionClarificationPrompt,
} from "./prompt";

const manifest = contentManifestSchema.parse(manifestJson);

describe("AI coach contract", () => {
  it("builds a grounded prompt with untrusted candidate boundaries", () => {
    const question = manifest.questions[0];
    const lesson = manifest.lessons.find((item) => item.id === question.lessonId)!;
    const prompt = buildCoachPrompt({
      question,
      lesson,
      candidateAnswer: "auto tạo một copy, còn auto& là reference.",
    });

    expect(prompt).toContain(question.rubric.required[0]);
    expect(prompt).toContain(`<source id="${question.sources[0].sectionId}"`);
    expect(prompt).toContain('<candidate_answer status="provided">');
  });

  it("accepts blank, short and long answers while rejecting malformed data", () => {
    expect(
      coachRequestSchema.safeParse({ questionId: "cpp11-auto-001", answer: "" })
        .success,
    ).toBe(true);
    expect(
      coachRequestSchema.safeParse({
        questionId: "cpp11-auto-001",
        answer: "ngắn",
      }).success,
    ).toBe(true);
    expect(
      coachRequestSchema.safeParse({
        questionId: "cpp11-auto-001",
        answer: "x".repeat(7000),
      }).success,
    ).toBe(true);
    expect(
      coachRequestSchema.safeParse({
        questionId: "cpp11-auto-001",
        answer: 42,
      }).success,
    ).toBe(false);
    expect(
      coachFeedbackSchema.safeParse({ score: 120, verdict: "perfect" }).success,
    ).toBe(false);
  });

  it("treats a blank answer as not knowing and asks the coach to teach", () => {
    const question = manifest.questions[0];
    const lesson = manifest.lessons.find((item) => item.id === question.lessonId)!;
    const prompt = buildCoachPrompt({
      question,
      lesson,
      candidateAnswer: "   ",
    });

    expect(prompt).toContain('status="not_provided"');
    expect(prompt).toContain("chưa biết cách làm");
    expect(prompt).toContain("score 0");
    expect(prompt).toContain("dạy lời giải từ nền tảng");
  });

  it("converts an accidental 8/10 score when verdict and rubric mean solid", () => {
    const normalized = normalizeCoachFeedback({
      ...sampleFeedback(),
      score: 8,
      verdict: "solid",
      coverage: [
        { criterion: "Kết luận", status: "met", feedback: "Đúng." },
        { criterion: "Giải thích", status: "met", feedback: "Đúng." },
        { criterion: "Cách sửa", status: "met", feedback: "Đúng." },
      ],
    });

    expect(normalized.score).toBe(80);
    expect(normalized.verdict).toBe("solid");
  });

  it("keeps a genuine 8/100 needs-work score", () => {
    const normalized = normalizeCoachFeedback({
      ...sampleFeedback(),
      score: 8,
      verdict: "needs_work",
      coverage: [
        { criterion: "Kết luận", status: "missed", feedback: "Sai." },
      ],
    });

    expect(normalized.score).toBe(8);
    expect(normalized.verdict).toBe("needs_work");
  });

  it("requires an alternating follow-up conversation ending with the user", () => {
    const base = {
      questionId: "cpp11-auto-001",
      candidateAnswer: "auto tạo một copy, còn auto& là reference.",
      feedback: sampleFeedback(),
    };
    expect(
      coachFollowUpRequestSchema.safeParse({
        ...base,
        idempotencyKey: "23966699-ebc3-4b74-9a16-0ca48f4a47c7",
        messages: [{ role: "user", content: "Tại sao lại tạo copy?" }],
      }).success,
    ).toBe(true);
    expect(
      coachFollowUpRequestSchema.safeParse({
        ...base,
        idempotencyKey: "not-a-uuid",
        messages: [{ role: "user", content: "Tại sao lại tạo copy?" }],
      }).success,
    ).toBe(false);
    expect(
      coachFollowUpRequestSchema.safeParse({
        ...base,
        messages: [{ role: "assistant", content: "Giải thích" }],
      }).success,
    ).toBe(false);
    expect(
      coachFollowUpRequestSchema.safeParse({
        ...base,
        candidateAnswer: "",
        messages: [{ role: "user", content: "Hãy dạy tôi từ đầu." }],
      }).success,
    ).toBe(true);
    expect(
      coachFollowUpRequestSchema.safeParse({
        ...base,
        candidateAnswer: "x".repeat(7000),
        messages: [{ role: "user", content: "Hãy giải thích tiếp." }],
      }).success,
    ).toBe(true);
  });

  it("grounds follow-up prompts in feedback, conversation and source notes", () => {
    const question = manifest.questions[0];
    const lesson = manifest.lessons.find((item) => item.id === question.lessonId)!;
    const prompt = buildCoachFollowUpPrompt({
      question,
      lesson,
      candidateAnswer: "Tôi chưa phân biệt được copy và reference.",
      feedback: sampleFeedback(),
      messages: [{ role: "user", content: "Giải thích bằng ví dụ nhỏ nhé" }],
    });

    expect(prompt).toContain("Giải thích bằng ví dụ nhỏ nhé");
    expect(prompt).toContain(`<source id="${question.sources[0].sectionId}"`);
    expect(prompt).toContain("<grading_feedback>");
  });

  it("clarifies the prompt without sending an answer or rubric to Luna", () => {
    const question = manifest.questions[0];
    const lesson = manifest.lessons.find((item) => item.id === question.lessonId)!;
    const prompt = buildQuestionClarificationPrompt({ question, lesson });

    expect(prompt).toContain(question.prompt);
    expect(prompt).not.toContain(question.answer.detailed);
    expect(prompt).not.toContain(question.rubric.required[0]);
    expect(prompt).toContain("Tuyệt đối không nêu đáp án");
    expect(prompt).toContain("người bạn vừa đọc xong");
    expect(prompt).toContain("Trường terms luôn trả về mảng rỗng");
    expect(buildCoachSystemInstruction(lesson, "clarify")).toContain(
      "tuyệt đối không tiết lộ đáp án",
    );
    expect(buildCoachSystemInstruction(lesson, "clarify")).toContain(
      "tránh từ điển thuật ngữ",
    );
    expect(
      questionClarificationSchema.safeParse({
        plainLanguage: "Nói nôm na, đề muốn biết bạn hiểu tình huống này tới đâu.",
        whatToAddress: ["Nói rõ điều đang xảy ra trong đề."],
        terms: [],
        scopeNote: "Chỉ bám theo dữ kiện đã có trong đề.",
      }).success,
    ).toBe(true);
  });

  it("uses the lesson language for Python grading and follow-ups", () => {
    const question = manifest.questions[0];
    const sourceLesson = manifest.lessons.find(
      (item) => item.id === question.lessonId,
    )!;
    const lesson = {
      ...sourceLesson,
      language: "python" as const,
      track: "python3" as const,
      standard: "python3" as const,
    };
    const grading = buildCoachPrompt({
      question,
      lesson,
      candidateAnswer: "A sufficiently detailed Python answer.",
    });
    const followUp = buildCoachFollowUpPrompt({
      question,
      lesson,
      candidateAnswer: "A sufficiently detailed Python answer.",
      feedback: sampleFeedback(),
      messages: [{ role: "user", content: "Cho tôi một ví dụ nhỏ." }],
    });

    expect(grading).toContain("phỏng vấn Python");
    expect(followUp).toContain("ví dụ Python ngắn");
    expect(buildCoachSystemInstruction(lesson, "evaluate")).toContain(
      "người phỏng vấn Python giàu kinh nghiệm",
    );
  });

  it("uses clear CMake terminology for grading and follow-ups", () => {
    const question = manifest.questions[0];
    const sourceLesson = manifest.lessons.find(
      (item) => item.id === question.lessonId,
    )!;
    const lesson = {
      ...sourceLesson,
      language: "cmake" as const,
      track: "cmake" as const,
      standard: "cmake" as const,
    };
    const grading = buildCoachPrompt({
      question,
      lesson,
      candidateAnswer: "A sufficiently detailed CMake answer.",
    });
    const followUp = buildCoachFollowUpPrompt({
      question,
      lesson,
      candidateAnswer: "A sufficiently detailed CMake answer.",
      feedback: sampleFeedback(),
      messages: [{ role: "user", content: "Cho tôi một ví dụ target nhỏ." }],
    });

    expect(grading).toContain("phỏng vấn CMake và hệ thống dựng");
    expect(followUp).toContain("ví dụ CMake và hệ thống dựng ngắn");
    expect(buildCoachSystemInstruction(lesson, "evaluate")).toContain(
      "người phỏng vấn CMake và hệ thống dựng giàu kinh nghiệm",
    );
  });
});

function sampleFeedback(): CoachFeedback {
  return {
    score: 60,
    verdict: "partial",
    summary: "Hiểu một phần.",
    strengths: ["Nhận ra reference."],
    coverage: [
      { criterion: "Phân biệt copy", status: "partial", feedback: "Còn thiếu ví dụ." },
    ],
    corrections: [],
    explanation: "auto thường suy luận theo giá trị.",
    nextStep: "Ôn lại type deduction.",
    followUpQuestion: "Khi nào dùng const auto&?",
    suggestedRating: "hard",
    sourceSectionIds: [],
  };
}
