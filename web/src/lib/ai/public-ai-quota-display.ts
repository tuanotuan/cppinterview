export type PublicAiQuotaSnapshot = {
  limit: number;
  remaining: number | null;
  resetsAt: string | null;
};

export function publicAiQuotaPresentation(
  quota: PublicAiQuotaSnapshot | null,
) {
  const limit = quota?.limit ?? 3;
  const remaining = quota?.remaining ?? null;
  const known = remaining !== null;

  return {
    limit,
    remaining,
    exhausted: remaining === 0,
    label: known ? `${remaining}/${limit} lượt còn` : "Đang kiểm tra",
    progressPercent: known
      ? Math.max(0, Math.min(100, (remaining / limit) * 100))
      : 0,
  };
}
