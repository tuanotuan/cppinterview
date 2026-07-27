import type { GeneratedLesson, Question } from "@/lib/content/schema";

export function buildMistakeCardPrompt({
  criterion,
  evidence,
  occurrenceCount,
  question,
  lesson,
  sections,
}: {
  criterion: string;
  evidence: Record<string, unknown>;
  occurrenceCount: number;
  question: Question;
  lesson: GeneratedLesson;
  sections: GeneratedLesson["sections"];
}) {
  return [
    "Create exactly one Vietnamese remediation flashcard for an interview learner.",
    "Target the missed concept without copying the original question.",
    "Use only the supplied lesson excerpts as factual authority.",
    "For scenario/design questions, prefer realistic low-latency trading, tick-data, order-book, data-pipeline, testing, or production constraints when the source supports them.",
    "Use responseMode=code only when answering genuinely requires writing code; otherwise use text.",
    "Do not reveal the answer in the prompt, scaffold, or hint. A scaffold may contain signatures and TODOs only.",
    "Keep the card atomic enough for spaced repetition.",
    "",
    `Missed criterion: ${criterion}`,
    `Observed occurrences: ${occurrenceCount}`,
    `Safe assessment evidence: ${JSON.stringify(evidence)}`,
    `Original question: ${question.prompt}`,
    `Lesson: ${lesson.title}`,
    "Grounding excerpts:",
    ...sections.map(
      (section) =>
        `--- ${section.id}: ${section.heading}\n${section.bodyMarkdown}`,
    ),
  ].join("\n");
}
