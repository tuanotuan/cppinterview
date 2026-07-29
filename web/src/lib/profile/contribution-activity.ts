export const CONTRIBUTION_WEEK_COUNT = 53;
export const CONTRIBUTION_DAY_COUNT = CONTRIBUTION_WEEK_COUNT * 7;

export type ContributionSource = "review" | "coach" | "mock";

export type ContributionEvent = {
  occurredOn: string;
  source: ContributionSource;
};

export type ContributionDay = {
  date: string;
  reviewCount: number;
  coachCount: number;
  mockCount: number;
  total: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type ContributionCalendar = {
  today: string;
  startDate: string;
  endDate: string;
  days: ContributionDay[];
  totalContributions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  totals: Record<ContributionSource, number>;
};

const EMPTY_TOTALS: Record<ContributionSource, number> = {
  review: 0,
  coach: 0,
  mock: 0,
};

export function buildContributionCalendar({
  today,
  events,
}: {
  today: string;
  events: ContributionEvent[];
}): ContributionCalendar {
  assertDateKey(today);
  const startDate = contributionStartDate(today);
  const endDate = addDateDays(startDate, CONTRIBUTION_DAY_COUNT - 1);
  const counts = new Map<
    string,
    Record<ContributionSource, number>
  >();

  for (const event of events) {
    if (!isDateKey(event.occurredOn)) continue;
    if (event.occurredOn < startDate || event.occurredOn > today) continue;
    const daily = counts.get(event.occurredOn) ?? { ...EMPTY_TOTALS };
    daily[event.source] += 1;
    counts.set(event.occurredOn, daily);
  }

  const totals = { ...EMPTY_TOTALS };
  const days = Array.from({ length: CONTRIBUTION_DAY_COUNT }, (_, index) => {
    const date = addDateDays(startDate, index);
    const daily = counts.get(date) ?? EMPTY_TOTALS;
    const total = daily.review + daily.coach + daily.mock;
    totals.review += daily.review;
    totals.coach += daily.coach;
    totals.mock += daily.mock;
    return {
      date,
      reviewCount: daily.review,
      coachCount: daily.coach,
      mockCount: daily.mock,
      total,
      level: contributionLevel(total),
    } satisfies ContributionDay;
  });

  const observedDays = days.filter((day) => day.date <= today);
  return {
    today,
    startDate,
    endDate,
    days,
    totalContributions: totals.review + totals.coach + totals.mock,
    activeDays: observedDays.filter((day) => day.total > 0).length,
    currentStreak: trailingStreak(observedDays),
    longestStreak: longestStreak(observedDays),
    totals,
  };
}

export function contributionStartDate(today: string) {
  assertDateKey(today);
  const weekday = dateKeyToUtcDate(today).getUTCDay();
  return addDateDays(today, -weekday - (CONTRIBUTION_WEEK_COUNT - 1) * 7);
}

export function timestampToVietnamDateKey(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function vietnamTodayDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function contributionLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  if (total <= 6) return 3;
  return 4;
}

export function addDateDays(date: string, days: number) {
  const value = dateKeyToUtcDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function trailingStreak(days: ContributionDay[]) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index]?.total === 0) break;
    streak += 1;
  }
  return streak;
}

function longestStreak(days: ContributionDay[]) {
  let longest = 0;
  let current = 0;
  for (const day of days) {
    if (day.total > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function dateKeyToUtcDate(date: string) {
  assertDateKey(date);
  return new Date(`${date}T00:00:00.000Z`);
}

function assertDateKey(date: string) {
  if (!isDateKey(date)) {
    throw new RangeError(`Invalid date key: ${date}`);
  }
}

function isDateKey(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) === date;
}
