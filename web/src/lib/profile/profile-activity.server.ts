import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  isAllowedPracticeUser,
  isTuanotuanQuestionAdmin,
} from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  addDateDays,
  buildContributionCalendar,
  contributionStartDate,
  timestampToVietnamDateKey,
  vietnamTodayDateKey,
  type ContributionCalendar,
  type ContributionEvent,
} from "./contribution-activity";
import {
  emptyMobileUsageSummary,
  type MobileUsageSummary,
} from "./mobile-usage";

export type ProfileAccount = {
  id: string;
  displayName: string;
  login: string | null;
  joinedAt: string;
};

export type ProfileActivity = {
  enabled: boolean;
  account: ProfileAccount | null;
  calendar: ContributionCalendar;
  mobileUsage: MobileUsageSummary | null;
  error: boolean;
};

export async function loadProfileActivity(): Promise<ProfileActivity> {
  const today = vietnamTodayDateKey();
  const emptyCalendar = buildContributionCalendar({ today, events: [] });

  if (!isSupabaseConfigured()) {
    return {
      enabled: false,
      account: null,
      calendar: emptyCalendar,
      mobileUsage: null,
      error: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user || !isAllowedPracticeUser(data.user)) {
    return {
      enabled: true,
      account: null,
      calendar: emptyCalendar,
      mobileUsage: null,
      error: false,
    };
  }

  const startDate = contributionStartDate(today);
  const timestampStart = `${startDate}T00:00:00+07:00`;
  const timestampEnd = `${addDateDays(today, 1)}T00:00:00+07:00`;
  const isAdmin = isTuanotuanQuestionAdmin(data.user);
  const [reviewsResult, coachResult, mockResult, mobileUsageResult] = await Promise.all([
    readReviewEvents(supabase, startDate, today),
    readTimestampEvents({
      supabase,
      table: "coach_attempts",
      column: "created_at",
      source: "coach",
      timestampStart,
      timestampEnd,
    }),
    readTimestampEvents({
      supabase,
      table: "mock_interview_attempts",
      column: "completed_at",
      source: "mock",
      timestampStart,
      timestampEnd,
      completedOnly: true,
    }),
    isAdmin
      ? readMobileUsage(supabase, today)
      : Promise.resolve({ summary: null, error: null }),
  ]);

  const events = [
    ...reviewsResult.events,
    ...coachResult.events,
    ...mockResult.events,
  ];

  const error = Boolean(
    reviewsResult.error ||
      coachResult.error ||
      mockResult.error ||
      mobileUsageResult.error,
  );
  if (error) {
    console.error("Profile contribution activity read failed", {
      reviews: reviewsResult.error?.code ?? null,
      coach: coachResult.error?.code ?? null,
      mock: mockResult.error?.code ?? null,
      mobileUsage: mobileUsageResult.error?.code ?? null,
    });
  }

  return {
    enabled: true,
    account: toProfileAccount(data.user),
    calendar: buildContributionCalendar({ today, events }),
    mobileUsage: mobileUsageResult.summary,
    error,
  };
}

type MobileUsageReadResult = {
  summary: MobileUsageSummary;
  error: ActivityReadError;
};

async function readMobileUsage(
  supabase: SupabaseClient,
  today: string,
): Promise<MobileUsageReadResult> {
  const startDate = addDateDays(today, -29);
  const { data, error } = await supabase
    .from("admin_mobile_usage_daily")
    .select("usage_date, active_seconds")
    .gte("usage_date", startDate)
    .lte("usage_date", today);
  if (error) return { summary: emptyMobileUsageSummary, error };

  const last7Start = addDateDays(today, -6);
  const summary = { ...emptyMobileUsageSummary };
  for (const row of data ?? []) {
    if (
      typeof row.usage_date !== "string" ||
      typeof row.active_seconds !== "number" ||
      row.active_seconds < 0
    ) {
      continue;
    }
    if (row.usage_date === today) summary.todaySeconds += row.active_seconds;
    if (row.usage_date >= last7Start) summary.last7DaysSeconds += row.active_seconds;
    summary.last30DaysSeconds += row.active_seconds;
  }
  return { summary, error: null };
}

type ActivityReadError = { code?: string | null } | null;
type ActivityReadResult = {
  events: ContributionEvent[];
  error: ActivityReadError;
};

const ACTIVITY_PAGE_SIZE = 1000;

export async function readReviewEvents(
  supabase: SupabaseClient,
  startDate: string,
  today: string,
): Promise<ActivityReadResult> {
  const events: ContributionEvent[] = [];
  for (let offset = 0; ;) {
    const { data, error } = await supabase
      .from("practice_reviews")
      .select("id, reviewed_on")
      .gte("reviewed_on", startDate)
      .lte("reviewed_on", today)
      .order("reviewed_on", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + ACTIVITY_PAGE_SIZE - 1);
    if (error) return { events, error };
    const page = data ?? [];
    for (const row of page) {
      if (typeof row.reviewed_on === "string") {
        events.push({ occurredOn: row.reviewed_on, source: "review" });
      }
    }
    if (page.length === 0) {
      return { events, error: null };
    }
    offset += page.length;
  }
}

export async function readTimestampEvents({
  supabase,
  table,
  column,
  source,
  timestampStart,
  timestampEnd,
  completedOnly = false,
}: {
  supabase: SupabaseClient;
  table: "coach_attempts" | "mock_interview_attempts";
  column: "created_at" | "completed_at";
  source: "coach" | "mock";
  timestampStart: string;
  timestampEnd: string;
  completedOnly?: boolean;
}): Promise<ActivityReadResult> {
  const events: ContributionEvent[] = [];
  for (let offset = 0; ;) {
    let query = supabase
      .from(table)
      .select(`id, ${column}`)
      .gte(column, timestampStart)
      .lt(column, timestampEnd);
    if (completedOnly) query = query.eq("status", "completed");
    const { data, error } = await query
      .order(column, { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + ACTIVITY_PAGE_SIZE - 1);
    if (error) return { events, error };
    const page = data ?? [];
    for (const row of page) {
      const value =
        column === "created_at" && "created_at" in row
          ? row.created_at
          : column === "completed_at" && "completed_at" in row
            ? row.completed_at
            : null;
      if (typeof value !== "string") continue;
      const occurredOn = timestampToVietnamDateKey(value);
      if (occurredOn) events.push({ occurredOn, source });
    }
    if (page.length === 0) {
      return { events, error: null };
    }
    offset += page.length;
  }
}

function toProfileAccount(user: User): ProfileAccount {
  const login = stringMetadata(user.user_metadata.user_name);
  return {
    id: user.id,
    displayName:
      stringMetadata(user.user_metadata.full_name) ||
      login ||
      user.email ||
      "Người học Recall",
    login,
    joinedAt: user.created_at,
  };
}

function stringMetadata(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
