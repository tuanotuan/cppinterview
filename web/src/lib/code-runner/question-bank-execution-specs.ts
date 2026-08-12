import type { ContentQuestion } from "@/lib/content/schema";
import type {
  ExecutionSuite,
  SandboxExecutionPlan,
} from "./execution-specs.server";

/**
 * This registry is deliberately server-import-only by convention. A real entry
 * must point to executable sample and hidden plans; never place a hidden case
 * in a content manifest or a client component.
 */
export type QuestionBankCodeTestSpec = {
  questionId: string;
  questionVersion: number;
  sourceHash: string;
  specRevision: number;
  publicTestCount: number;
  hiddenTestCount: number;
  createPlan: (source: string, suite: ExecutionSuite) => SandboxExecutionPlan;
};

// Code questions only become verified after a maintainer adds their real,
// server-owned execution plan here and wires it into the sandbox runner.
// The initial C++ corpus has no verified code question yet.
const specs: readonly QuestionBankCodeTestSpec[] = [];

export function questionBankCodeTestSpecForQuestion(
  question: Pick<
    ContentQuestion,
    "id" | "version" | "sourceHash" | "responseMode" | "codeTestSuite"
  >,
) {
  if (question.responseMode !== "code" || !question.codeTestSuite) return null;
  const spec = specs.find((item) => item.questionId === question.id);
  if (
    !spec ||
    spec.questionVersion !== question.version ||
    spec.sourceHash !== question.sourceHash ||
    spec.specRevision !== question.codeTestSuite.specRevision ||
    spec.publicTestCount !== question.codeTestSuite.publicTestCount ||
    spec.hiddenTestCount !== question.codeTestSuite.hiddenTestCount
  ) {
    return null;
  }
  return spec;
}

export function allQuestionBankCodeTestSpecs() {
  return [...specs];
}
