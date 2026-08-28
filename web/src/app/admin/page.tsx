import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/app/brand-mark";
import { buildAdminDashboardSnapshot } from "@/lib/admin/dashboard";
import { QUESTION_GENERATOR_PROMPT_VERSION } from "@/lib/content/drafts";
import { loadCloudContext } from "@/lib/practice/cloud-server";
import { loadMistakeCandidates } from "@/lib/practice/mistake-cards.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản trị — cppinterview",
  description: "Quản lý ngân hàng câu hỏi và độ phủ nội dung cppinterview.",
};

export default async function AdminPage() {
  const cloud = await loadCloudContext({ includeGenerationJobs: true });

  if (!cloud.enabled) {
    return <AdminGate mode="not-configured" />;
  }
  if (!cloud.account) {
    return <AdminGate mode="login" />;
  }
  if (!cloud.canManageQuestionBank) {
    return <AdminGate mode="restricted" />;
  }

  const manifest = cloud.manifest;
  const snapshot = buildAdminDashboardSnapshot(
    manifest,
    cloud.approvals,
    cloud.progress,
    cloud.questionStates,
    vietnamDateKey(),
    cloud.questionOverrides,
    cloud.questionTranslations,
  );
  const mistakes = await loadMistakeCandidates(
    await createSupabaseServerClient(),
  );

  return (
    <AdminDashboard
      account={cloud.account}
      aiUsage={cloud.aiUsage}
      geminiUsage={cloud.geminiUsage}
      initialGeminiFallbackEnabled={cloud.geminiFallbackEnabled}
      initialGenerationJobs={cloud.generationJobs}
      currentGeneratorVersion={QUESTION_GENERATOR_PROMPT_VERSION}
      initialSnapshot={snapshot}
      initialMistakeCandidates={mistakes.candidates}
      initialMistakeGenerationMode={mistakes.generationMode}
      mistakeQueueAvailable={mistakes.available}
    />
  );
}

function AdminGate({ mode }: { mode: "login" | "not-configured" | "restricted" }) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/70 p-8 shadow-[0_24px_80px_rgb(15_58_105_/_10%)] backdrop-blur sm:p-10">
        <BrandMark size="lg" />
        <p className="mt-8 font-mono text-xs font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
          Khu vực quản trị
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Khu vực quản trị riêng
        </h1>
        <p className="mt-4 leading-7 text-[#526276]">
          {mode === "login"
            ? "Đăng nhập bằng tài khoản GitHub của quản trị viên để xem bản nháp, đáp án và quản lý ngân hàng câu hỏi."
            : mode === "restricted"
              ? "Tài khoản này chỉ dùng để luyện thẻ và phỏng vấn thử. Khu vực quản trị chỉ dành cho tài khoản GitHub của quản trị viên."
              : "Supabase chưa được cấu hình nên trang quản trị chưa thể xác thực người dùng."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {mode === "login" ? (
            <form action="/auth/login?next=/admin" method="post">
              <button
                type="submit"
                className="rounded-2xl bg-[#0f3a69] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16865a] focus:ring-4 focus:ring-[#65e6d2] focus:outline-none"
              >
                Đăng nhập GitHub
              </button>
            </form>
          ) : null}
          <Link
            href="/practice"
            className="rounded-2xl border border-[#0f3a69]/15 bg-white px-5 py-3 text-sm font-bold transition hover:border-[#285f86]/40"
          >
            Về trang luyện tập
          </Link>
          {mode === "restricted" ? (
            <Link
              href="/mock-interview"
              className="rounded-2xl border border-[#0f3a69]/15 bg-white px-5 py-3 text-sm font-bold transition hover:border-[#285f86]/40"
            >
              Phỏng vấn thử
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function vietnamDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
