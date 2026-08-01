import { z } from "zod";

import { isAllowedPracticeUser } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { worldQuantTrainingStateSchema } from "@/lib/worldquant/training-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const writeSchema = z.object({
  state: worldQuantTrainingStateSchema,
  expectedRevision: z.number().int().nonnegative(),
});

export async function GET() {
  const context = await authenticatedContext();
  if (context instanceof Response) return context;

  const { data, error } = await context.supabase
    .from("worldquant_training_states")
    .select("state, revision")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) return unavailable();
  const state = worldQuantTrainingStateSchema.nullable().safeParse(data?.state ?? null);
  if (!state.success) return unavailable();
  return Response.json({ state: state.data, revision: Number(data?.revision ?? 0) }, noStore());
}

export async function PUT(request: Request) {
  const context = await authenticatedContext();
  if (context instanceof Response) return context;
  const body = await jsonBody(request);
  const parsed = writeSchema.safeParse(body);
  if (!parsed.success) return invalid();

  const { data, error } = await context.supabase.rpc(
    "save_worldquant_training_state",
    { p_state: parsed.data.state, p_expected_revision: parsed.data.expectedRevision },
  );
  if (error || !data || typeof data !== "object") return unavailable();
  const result = z.object({
    state: worldQuantTrainingStateSchema,
    revision: z.number().int().nonnegative(),
    conflict: z.boolean(),
  }).safeParse(data);
  if (!result.success) return unavailable();
  return Response.json(result.data, { status: result.data.conflict ? 409 : 200, ...noStore() });
}

async function authenticatedContext() {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Đồng bộ tiến độ chưa được cấu hình." }, { status: 503, ...noStore() });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return Response.json({ error: "Cần đăng nhập để đồng bộ tiến độ." }, { status: 401, ...noStore() });
  }
  if (!isAllowedPracticeUser(data.user)) {
    return Response.json({ error: "Tài khoản này không có quyền đồng bộ tiến độ." }, { status: 403, ...noStore() });
  }
  return { supabase, userId: data.user.id };
}

async function jsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  return request.json().catch(() => null);
}

function invalid() {
  return Response.json({ error: "Dữ liệu tiến độ không hợp lệ." }, { status: 400, ...noStore() });
}

function unavailable() {
  return Response.json({ error: "Chưa thể đồng bộ tiến độ. Dữ liệu trên thiết bị vẫn được giữ." }, { status: 503, ...noStore() });
}

function noStore() {
  return { headers: { "Cache-Control": "no-store" } };
}
