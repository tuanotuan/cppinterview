import { mockInterviewCompletedArtifactV4Schema } from "@/lib/mock-interview/contracts-v4";
import {
  createMockHistoryAdminClient,
  deleteMockInterviewAttempt,
  listMockInterviewAttempts,
  MockHistoryConfigurationError,
} from "@/lib/mock-interview/history.server";
import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  worldQuantRoleProfileIds,
  type WorldQuantRoleProfileId,
} from "@/lib/worldquant/readiness";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authorizeHistory();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const roleValue = url.searchParams.get("role");
  const roleProfileId =
    roleValue &&
    worldQuantRoleProfileIds.includes(
      roleValue as WorldQuantRoleProfileId,
    )
      ? roleValue
      : null;
  const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
  const limit =
    Number.isInteger(requestedLimit) &&
    requestedLimit >= 1 &&
    requestedLimit <= 50
      ? requestedLimit
      : 20;
  const before = url.searchParams.get("before");
  const beforeId = url.searchParams.get("beforeId");
  if (
    (before === null) !== (beforeId === null) ||
    (before !== null &&
      (!Number.isFinite(Date.parse(before)) ||
        !isUuid(beforeId ?? "")))
  ) {
    return Response.json(
      {
        ok: false,
        error: "History cursor không hợp lệ.",
        code: "invalid_cursor",
      },
      { status: 400, headers: privateNoStoreHeaders() },
    );
  }

  try {
    const page = await listMockInterviewAttempts(
      createMockHistoryAdminClient(),
      {
        userId: auth.userId,
        roleProfileId,
        limit,
        cursor:
          before && beforeId
            ? { createdAt: before, attemptId: beforeId }
            : null,
      },
    );
    return Response.json({
      ok: true,
      items: page.items.flatMap((attempt) => {
        if (attempt.status !== "completed") return [];
        const artifact =
          mockInterviewCompletedArtifactV4Schema.safeParse(
            attempt.report,
          );
        return artifact.success
          ? [{ attemptId: attempt.attemptId, artifact: artifact.data }]
          : [];
      }),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    }, { headers: privateNoStoreHeaders() });
  } catch (error) {
    return historyError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeHistory();
  if (!auth.ok) return auth.response;
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return Response.json(
      {
        ok: false,
        error: "History delete chỉ nhận application/json.",
        code: "unsupported_media_type",
      },
      { status: 415 },
    );
  }
  const declaredLength = Number(
    request.headers.get("content-length") ?? "0",
  );
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > 4 * 1024
  ) {
    return Response.json(
      {
        ok: false,
        error: "History delete body vượt giới hạn.",
        code: "request_too_large",
      },
      { status: 413 },
    );
  }
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4 * 1024) {
      return Response.json(
        {
          ok: false,
          error: "History delete body vượt giới hạn.",
          code: "request_too_large",
        },
        { status: 413 },
      );
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { ok: false, error: "JSON không hợp lệ.", code: "invalid_json" },
      { status: 400 },
    );
  }
  const attemptId =
    typeof body === "object" &&
    body !== null &&
    "attemptId" in body &&
    typeof body.attemptId === "string"
      ? body.attemptId
      : "";
  if (
    !isUuid(attemptId)
  ) {
    return Response.json(
      {
        ok: false,
        error: "Attempt ID không hợp lệ.",
        code: "invalid_attempt",
      },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteMockInterviewAttempt(
      createMockHistoryAdminClient(),
      { userId: auth.userId, attemptId },
    );
    return Response.json({ ok: true, deleted });
  } catch (error) {
    return historyError(error);
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function privateNoStoreHeaders() {
  return { "Cache-Control": "private, no-store" };
}

async function authorizeHistory(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          error: "Supabase chưa được cấu hình.",
          code: "not_configured",
        },
        { status: 503 },
      ),
    };
  }
  const supabase = await createSupabaseServerClient();
  const auth = await supabase.auth.getUser();
  if (auth.error || !auth.data.user) {
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          error: "Đăng nhập để xem mock history.",
          code: "authentication_required",
        },
        { status: 401 },
      ),
    };
  }
  if (!isAllowedPracticeUser(auth.data.user)) {
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          error: "Tài khoản này không có quyền xem mock history.",
          code: "forbidden",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, userId: auth.data.user.id };
}

function historyError(error: unknown) {
  if (error instanceof MockHistoryConfigurationError) {
    return Response.json(
      {
        ok: false,
        error:
          "Cloud history chưa được cấu hình hoặc migration chưa được apply.",
        code: "history_not_configured",
      },
      { status: 503 },
    );
  }
  console.error("Mock history route failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    {
      ok: false,
      error: "Không đọc được mock history.",
      code: "history_failed",
    },
    { status: 502 },
  );
}
