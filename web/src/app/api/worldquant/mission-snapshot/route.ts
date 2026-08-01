import { z } from "zod";

import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { worldQuantMissionSnapshotSchema } from "@/lib/worldquant/mission-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scopeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roleProfileId: z.enum(["tick-data-platform", "cpp-data-platform", "low-latency-cpp", "senior-cpp-platform"]),
  timeBudgetMinutes: z.number().int().min(15).max(120),
});
const writeSchema = scopeSchema.extend({
  snapshot: worldQuantMissionSnapshotSchema,
  expectedRevision: z.number().int().nonnegative(),
}).superRefine((value, context) => {
  if (value.snapshot.date !== value.date || value.snapshot.roleProfileId !== value.roleProfileId || value.snapshot.timeBudgetMinutes !== value.timeBudgetMinutes) {
    context.addIssue({ code: "custom", message: "Snapshot must match its storage scope." });
  }
});

export async function GET(request: Request) {
  const context = await authenticatedContext();
  if (context instanceof Response) return context;
  const parsed = scopeSchema.safeParse({
    date: new URL(request.url).searchParams.get("date"),
    roleProfileId: new URL(request.url).searchParams.get("role"),
    timeBudgetMinutes: Number(new URL(request.url).searchParams.get("minutes")),
  });
  if (!parsed.success) return invalid();
  const { data, error } = await context.supabase
    .from("worldquant_mission_snapshots")
    .select("snapshot, revision")
    .eq("user_id", context.userId)
    .eq("mission_date", parsed.data.date)
    .eq("role_profile_id", parsed.data.roleProfileId)
    .eq("time_budget_minutes", parsed.data.timeBudgetMinutes)
    .maybeSingle();
  if (error) return unavailable();
  const snapshot = worldQuantMissionSnapshotSchema.nullable().safeParse(data?.snapshot ?? null);
  if (!snapshot.success) return unavailable();
  return Response.json({ snapshot: snapshot.data, revision: Number(data?.revision ?? 0) }, noStore());
}

export async function PUT(request: Request) {
  const context = await authenticatedContext();
  if (context instanceof Response) return context;
  const parsed = writeSchema.safeParse(await jsonBody(request));
  if (!parsed.success) return invalid();
  const { data, error } = await context.supabase.rpc(
    "save_worldquant_mission_snapshot",
    {
      p_date: parsed.data.date,
      p_role_profile_id: parsed.data.roleProfileId,
      p_time_budget_minutes: parsed.data.timeBudgetMinutes,
      p_snapshot: parsed.data.snapshot,
      p_expected_revision: parsed.data.expectedRevision,
    },
  );
  if (error || !data || typeof data !== "object") return unavailable();
  const result = z.object({ snapshot: worldQuantMissionSnapshotSchema, revision: z.number().int().nonnegative(), conflict: z.boolean() }).safeParse(data);
  if (!result.success) return unavailable();
  return Response.json(result.data, { status: result.data.conflict ? 409 : 200, ...noStore() });
}

async function authenticatedContext() {
  if (!isSupabaseConfigured()) return Response.json({ error: "Đồng bộ tiến độ chưa được cấu hình." }, { status: 503, ...noStore() });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return Response.json({ error: "Cần đăng nhập để đồng bộ kế hoạch." }, { status: 401, ...noStore() });
  if (!isAllowedPracticeUser(data.user)) return Response.json({ error: "Tài khoản này không có quyền đồng bộ kế hoạch." }, { status: 403, ...noStore() });
  return { supabase, userId: data.user.id };
}

async function jsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  return request.json().catch(() => null);
}

function invalid() { return Response.json({ error: "Dữ liệu kế hoạch không hợp lệ." }, { status: 400, ...noStore() }); }
function unavailable() { return Response.json({ error: "Chưa thể đồng bộ kế hoạch. Bản trên thiết bị vẫn được giữ." }, { status: 503, ...noStore() }); }
function noStore() { return { headers: { "Cache-Control": "no-store" } }; }
