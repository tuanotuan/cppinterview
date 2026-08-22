import { z } from "zod";

import type { CodeExecutionResult } from "@/lib/code-runner/contracts";
import type { TargetedMockPlan } from "@/lib/mock-interview/target-plan";
import type { WorldQuantCompetencyKey } from "./readiness";

export const worldQuantMockGateKeys = [
  "cpp_correctness",
  "market_data_correctness",
  "migration_evidence",
] as const;
export type WorldQuantMockGateKey = (typeof worldQuantMockGateKeys)[number];

const gateSchema = z
  .object({
    key: z.enum(worldQuantMockGateKeys),
    label: z.string().min(1).max(120),
    threshold: z.literal(65),
    status: z.enum(["passed", "needs_work", "not_assessed"]),
    score: z.number().int().min(0).max(100).nullable(),
    evidenceQuestionIds: z.array(z.string().min(1).max(160)),
    reason: z.string().min(1).max(300),
  })
  .strict();

export const worldQuantMockGateSetSchema = z
  .object({
    version: z.literal(1),
    roleReadinessClaim: z.literal("not_claimed"),
    gates: z.array(gateSchema).length(worldQuantMockGateKeys.length),
  })
  .strict();

export type WorldQuantMockGate = z.infer<typeof gateSchema>;
export type WorldQuantMockGateSet = z.infer<typeof worldQuantMockGateSetSchema>;

const gateDefinitions: Readonly<
  Record<
    WorldQuantMockGateKey,
    {
      label: string;
      competencies: readonly WorldQuantCompetencyKey[];
      requiresMigrationScenario?: boolean;
    }
  >
> = {
  cpp_correctness: {
    label: "Tính đúng đắn C++",
    competencies: ["modern_cpp"],
  },
  market_data_correctness: {
    label: "Tính đúng đắn dữ liệu thị trường",
    competencies: ["tick_market_data"],
  },
  migration_evidence: {
    label: "Bằng chứng chuyển đổi hệ thống",
    competencies: ["ownership_communication", "distributed_data_platform"],
    requiresMigrationScenario: true,
  },
};

export function buildWorldQuantMockGates({
  plan,
  scores,
  executionByQuestionId,
}: {
  plan: TargetedMockPlan;
  scores: readonly { questionId: string; score: number }[];
  executionByQuestionId: ReadonlyMap<
    string,
    Pick<CodeExecutionResult, "status">
  >;
}): WorldQuantMockGateSet {
  const scoreByQuestionId = new Map(scores.map((item) => [item.questionId, item.score]));
  const gates = worldQuantMockGateKeys.map((key): WorldQuantMockGate => {
    const definition = gateDefinitions[key];
    const evidence = plan.questions.filter(
      (question) =>
        definition.competencies.includes(question.readinessCompetency) &&
        (!definition.requiresMigrationScenario ||
          plan.blueprintId === "migration-incident"),
    );
    const evidenceQuestionIds = evidence.map((item) => item.question.id);
    if (evidenceQuestionIds.length === 0) {
      return {
        key,
        label: definition.label,
        threshold: 65,
        status: "not_assessed",
        score: null,
        evidenceQuestionIds,
        reason: "Phiên này không có nhiệm vụ đủ trực tiếp để kết luận tiêu chí này.",
      };
    }
    const score = Math.round(
      evidenceQuestionIds.reduce(
        (sum, id) => sum + (scoreByQuestionId.get(id) ?? 0),
        0,
      ) / evidenceQuestionIds.length,
    );
    const failedExecution = evidenceQuestionIds.some((id) => {
      const execution = executionByQuestionId.get(id);
      return execution && execution.status !== "passed" && execution.status !== "sandbox_error";
    });
    const passed = score >= 65 && !failedExecution;
    return {
      key,
      label: definition.label,
      threshold: 65,
      status: passed ? "passed" : "needs_work",
      score,
      evidenceQuestionIds,
      reason: failedExecution
        ? "Ít nhất một bài C++ có kiểm thử ẩn không đạt; cần sửa trước khi dùng bằng chứng này."
        : passed
          ? "Đủ bằng chứng trong phạm vi phiên này."
          : "Điểm bằng chứng chưa đạt ngưỡng 65/100 của tiêu chí này.",
    };
  });
  return worldQuantMockGateSetSchema.parse({
    version: 1,
    roleReadinessClaim: "not_claimed",
    gates,
  });
}
