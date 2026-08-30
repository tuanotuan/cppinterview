export const questionApprovalBatchSize = 200;

export type QuestionApprovalBatchResult<T> = {
  approved: T[];
  error: string | null;
};

export async function submitQuestionApprovalBatches<T>({
  items,
  submit,
  failureMessage,
  onBatchApproved,
}: {
  items: readonly T[];
  submit: (batch: readonly T[]) => Promise<Response>;
  failureMessage: string;
  onBatchApproved?: (batch: readonly T[]) => void;
}): Promise<QuestionApprovalBatchResult<T>> {
  const approved: T[] = [];

  for (let index = 0; index < items.length; index += questionApprovalBatchSize) {
    const batch = items.slice(index, index + questionApprovalBatchSize);
    let response: Response;
    try {
      response = await submit(batch);
    } catch {
      return { approved, error: failureMessage };
    }

    if (!response.ok) {
      return {
        approved,
        error: await readApprovalError(response, failureMessage),
      };
    }

    approved.push(...batch);
    onBatchApproved?.(batch);
  }

  return { approved, error: null };
}

async function readApprovalError(response: Response, fallback: string) {
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") return fallback;

  const error = Reflect.get(payload, "error");
  return typeof error === "string" && error.trim()
    ? error.trim().slice(0, 500)
    : fallback;
}
