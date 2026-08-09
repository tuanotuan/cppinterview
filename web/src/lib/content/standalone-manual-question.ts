import { questionRevisionChecksum } from "./backfill";
import type { ManualQuestionRequest } from "./question-overrides";
import type { ContentQuestion, GeneratedLesson, Question } from "./schema";
import { buildQuestionTaxonomy } from "./taxonomy";

export type StandaloneManualQuestionDraft = {
  type: Question["type"];
  responseMode: "text";
  difficulty: "intermediate";
  estimatedMinutes: 3;
  prompt: string;
  code: null;
  hint: string;
  answer: ContentQuestion["answer"];
  rubric: ContentQuestion["rubric"];
  sources: ContentQuestion["sources"];
  sourceHash: string;
  taxonomy: ContentQuestion["taxonomy"];
  contentChecksum: string;
};

export const standaloneManualQuestionLessonId = "admin-manual-questions";
export const standaloneManualQuestionSectionId = "admin-entry";
export const standaloneManualQuestionSourceHash =
  "0505028173d1f586e2889d1d107f7b3d371a013cc18b9e0ed8d3c13c4cb3259c";

export const standaloneManualQuestionLesson: GeneratedLesson = {
  id: standaloneManualQuestionLessonId,
  language: "cpp",
  track: "cpp20",
  standard: "cpp20",
  sourcePath: "admin/manual-questions",
  order: 1_000_000,
  tags: ["manual"],
  prerequisites: [],
  title: "Câu hỏi nhập thủ công",
  knowledgePath: "admin/manual-questions",
  codePath: null,
  sourceHash: standaloneManualQuestionSourceHash,
  sections: [
    {
      id: standaloneManualQuestionSectionId,
      heading: "Câu hỏi độc lập do quản trị viên nhập",
      bodyMarkdown: "",
      bodyText: "",
    },
  ],
  checklistItems: [],
  code: null,
};

export function isStandaloneManualQuestionLesson(lessonId: string) {
  return lessonId === standaloneManualQuestionLessonId;
}

export function buildStandaloneManualQuestion(
  input: ManualQuestionRequest,
): StandaloneManualQuestionDraft {
  const answer = input.referenceAnswer.trim();
  const shortAnswer = answer.length <= 3000
    ? answer
    : `${answer.slice(0, 2999).trimEnd()}…`;
  const base: Question = {
    id: `${standaloneManualQuestionLessonId}-preview`,
    lessonId: standaloneManualQuestionLessonId,
    type: "recall",
    responseMode: "text",
    difficulty: "intermediate",
    estimatedMinutes: 3,
    prompt: input.prompt.trim(),
    hint: "Trình bày suy nghĩ của bạn trước khi xem đáp án tham khảo.",
    answer: { short: shortAnswer, detailed: answer },
    rubric: {
      required: ["Câu trả lời bám sát đáp án tham khảo do quản trị viên cung cấp."],
      bonus: [],
      misconceptions: [],
    },
    sources: [{ sectionId: standaloneManualQuestionSectionId }],
    sourceHash: standaloneManualQuestionSourceHash,
    status: "draft",
    version: 1,
  };
  const question: ContentQuestion = {
    ...base,
    taxonomy: buildQuestionTaxonomy(base, standaloneManualQuestionLesson),
  };

  return {
    type: "recall",
    responseMode: "text",
    difficulty: "intermediate",
    estimatedMinutes: 3,
    prompt: question.prompt,
    code: null,
    hint: question.hint,
    answer: question.answer,
    rubric: question.rubric,
    sources: question.sources,
    sourceHash: question.sourceHash,
    taxonomy: question.taxonomy,
    contentChecksum: questionRevisionChecksum(question),
  };
}
