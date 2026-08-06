export type MobileUsageSummary = {
  todaySeconds: number;
  last7DaysSeconds: number;
  last30DaysSeconds: number;
};

export const emptyMobileUsageSummary: MobileUsageSummary = {
  todaySeconds: 0,
  last7DaysSeconds: 0,
  last30DaysSeconds: 0,
};

export function formatActiveDuration(seconds: number): string {
  const normalized = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);

  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút`;
  return "Dưới 1 phút";
}
