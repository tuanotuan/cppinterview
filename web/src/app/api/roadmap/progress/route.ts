import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isLessonInRoadmapTrack,
  roadmapLessonIds,
  roadmapProgressDeleteSchema,
  roadmapProgressMutationSchema,
} from "@/lib/learn/roadmap-progress.server";
import {
  isRoadmapProgressStatus,
  isRoadmapTrack,
  type RoadmapProgressStatus,
} from "@/lib/learn/roadmap-progress";
import { authenticatedAccountIdFromClaims } from "@/lib/supabase/authenticated-account";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

type AuthenticatedContext = {
  supabase: SupabaseClient;
  userId: string;
};

export async function GET(request: Request) {
  const track = new URL(request.url).searchParams.get("track");
  if (!isRoadmapTrack(track)) {
    return jsonError("invalid_request", 400);
  }

  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  const allowedLessonIds = roadmapLessonIds(track);
  const { data, error } = await auth.supabase
    .from("user_roadmap_lesson_states")
    .select("lesson_id, status")
    .eq("user_id", auth.userId)
    .in("lesson_id", allowedLessonIds);

  if (error) return jsonError("roadmap_progress_unavailable", 502);

  const states: Array<{ lessonId: string; status: RoadmapProgressStatus }> = [];
  for (const row of data ?? []) {
    if (
      typeof row.lesson_id !== "string" ||
      !allowedLessonIds.includes(row.lesson_id) ||
      !isRoadmapProgressStatus(row.status)
    ) {
      return jsonError("roadmap_progress_unavailable", 502);
    }
    states.push({ lessonId: row.lesson_id, status: row.status });
  }

  return jsonResponse({ states });
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("forbidden", 403);

  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = roadmapProgressMutationSchema.safeParse(body);
  if (
    !parsed.success ||
    !isLessonInRoadmapTrack(parsed.data.track, parsed.data.lessonId)
  ) {
    return jsonError("invalid_request", 400);
  }

  const { error } = await auth.supabase
    .from("user_roadmap_lesson_states")
    .upsert(
      {
        user_id: auth.userId,
        lesson_id: parsed.data.lessonId,
        status: parsed.data.status,
      },
      { onConflict: "user_id,lesson_id" },
    );

  if (error) return jsonError("roadmap_progress_unavailable", 502);
  return jsonResponse({
    lessonId: parsed.data.lessonId,
    status: parsed.data.status,
  });
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("forbidden", 403);

  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = roadmapProgressDeleteSchema.safeParse(body);
  if (
    !parsed.success ||
    !isLessonInRoadmapTrack(parsed.data.track, parsed.data.lessonId)
  ) {
    return jsonError("invalid_request", 400);
  }

  const { error } = await auth.supabase
    .from("user_roadmap_lesson_states")
    .delete()
    .eq("user_id", auth.userId)
    .eq("lesson_id", parsed.data.lessonId);

  if (error) return jsonError("roadmap_progress_unavailable", 502);
  return jsonResponse({ deleted: true, lessonId: parsed.data.lessonId });
}

async function authenticateRequest(): Promise<AuthenticatedContext | Response> {
  if (!isSupabaseConfigured()) {
    return jsonError("roadmap_progress_unavailable", 503);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = error
      ? null
      : authenticatedAccountIdFromClaims(data?.claims);
    if (!userId) return jsonError("authentication_required", 401);
    return { supabase, userId };
  } catch {
    return jsonError("roadmap_progress_unavailable", 503);
  }
}

async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return jsonError("invalid_json", 400);
  }
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function jsonError(error: string, status: number) {
  return jsonResponse({ error }, { status });
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...responseHeaders, ...init.headers },
  });
}
