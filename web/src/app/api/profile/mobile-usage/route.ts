import { z } from "zod";

import { isTuanotuanQuestionAdmin } from "@/lib/supabase/authorization";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const heartbeatSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Dịch vụ tài khoản chưa sẵn sàng." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Phiên theo dõi không hợp lệ." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) {
    return Response.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  if (!isTuanotuanQuestionAdmin(data.user)) {
    return Response.json({ error: "Không có quyền theo dõi này." }, { status: 403 });
  }

  const { error } = await supabase.rpc("record_admin_mobile_usage_heartbeat", {
    p_client_session_id: parsed.data.sessionId,
  });
  if (error) {
    console.error("Admin mobile usage heartbeat failed", { code: error.code ?? null });
    return Response.json({ error: "Chưa thể lưu thời gian hoạt động." }, { status: 503 });
  }

  return new Response(null, { status: 204 });
}
