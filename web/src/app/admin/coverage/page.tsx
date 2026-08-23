import type { Metadata } from "next";
import Link from "next/link";

import { loadCloudContext } from "@/lib/practice/cloud-server";
import {
  interviewQuestionCategoryLabels,
  summarizeInterviewQuestionBank,
} from "@/lib/content/interview-bank";
import { buildCurriculumEvidenceFromManifest } from "@/lib/worldquant/curriculum-evidence";
import {
  worldQuantCompetencies,
  worldQuantCompetencyKeys,
} from "@/lib/worldquant/readiness";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mức bao phủ nội dung — cppinterview",
  description:
    "Ưu tiên duyệt nội dung theo năng lực WorldQuant và mức bao phủ bài tập vận dụng.",
};

const coverageStatusLabels: Record<string, string> = {
  pending_review: "Chờ duyệt",
  content_gap: "Thiếu nội dung",
  drill_only: "Chỉ có bài luyện",
  flashcard_only: "Chỉ có thẻ ghi nhớ",
  transfer_ready: "Sẵn sàng vận dụng",
};

export default async function CoverageStudioPage() {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  if (!cloud.enabled || !cloud.account || !cloud.canManageQuestionBank) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <section className="max-w-lg rounded-[1.25rem] border border-[#0f3a69]/15 bg-white/70 p-8">
          <p className="font-mono text-xs font-bold text-[#a65c0e] uppercase">
            Dành cho quản trị viên
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Bạn cần đăng nhập để xem mức bao phủ nội dung.
          </h1>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white"
          >
            Về trang quản trị
          </Link>
        </section>
      </main>
    );
  }
  const coverage = buildCurriculumEvidenceFromManifest({
    manifest: cloud.manifest,
    approvals: cloud.approvals,
    mistakeQuestionIds: cloud.mistakeQuestionIds,
  });
  const bank = summarizeInterviewQuestionBank(cloud.manifest.questions);
  const editorialQueue = coverage.concepts
    .filter((item) => item.status !== "transfer_ready")
    .sort(
      (left, right) =>
        studioPriority(left.status) - studioPriority(right.status) ||
        right.pendingQuestionIds.length -
          left.pendingQuestionIds.length ||
        left.concept.id.localeCompare(right.concept.id),
    );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1450px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/15 pb-5">
          <Link
            href="/"
            aria-label="Về trang chủ cppinterview"
            title="Về trang chủ cppinterview"
            className="flex items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono font-bold text-[#65e6d2]">
              R
            </span>
            <span>
              <span className="block font-bold">Mức bao phủ nội dung</span>
              <span className="block text-xs text-[#526276]">
                Điều phối việc biên tập
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl px-4 py-2 text-sm font-bold"
            >
              Quản lý câu hỏi
            </Link>
            <Link
              href="/worldquant/curriculum"
              className="rounded-xl px-4 py-2 text-sm font-bold"
            >
              Sơ đồ chương trình học
            </Link>
          </nav>
        </header>

        <section className="py-9">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
            Ưu tiên bổ sung học liệu
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Ưu tiên duyệt những phần còn thiếu.
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-[#526276]">
            Thẻ sửa lỗi cá nhân không được tính vào mức bao phủ nội dung. Bài
            luyện cũng không thay thế thẻ ghi nhớ đã duyệt; hai loại bằng
            chứng học tập được theo dõi riêng.
          </p>
        </section>

        <section className="rounded-[1.25rem] border border-[#0f3a69]/12 bg-[#0f3a69] p-5 text-white sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#65e6d2] uppercase">
                Ngân hàng phỏng vấn C++
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                {bank.verified}/{bank.target} câu đã xác minh
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                Chỉ câu có nguồn hoặc editorial, đáp án, tiêu chí chấm và — với câu code — test công khai lẫn test ẩn phía máy chủ mới được tính vào mục tiêu này. Bản nháp AI luôn chờ duyệt.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat value={bank.draft} label="bản nháp" />
              <MiniStat value={bank.needsReview} label="cần xem lại" />
              <MiniStat value={bank.codeTestReady} label="code có test" />
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bank.categories.map((item) => {
              const percent = Math.min(
                100,
                Math.round((item.verified / item.target) * 100),
              );
              return (
                <article
                  key={item.category}
                  className="rounded-2xl border border-white/12 bg-white/7 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {interviewQuestionCategoryLabels[item.category]}
                    </h3>
                    <span className="font-mono text-xs font-bold text-[#65e6d2]">
                      {item.verified}/{item.target}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-[#65e6d2]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-white/65">
                    {item.total} trong ngân hàng · {item.draft} chờ duyệt · còn {item.remaining}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {worldQuantCompetencyKeys.map((competency) => {
            const summary = coverage.competencies[competency];
            return (
              <article
                key={competency}
                className="rounded-2xl border border-[#0f3a69]/10 bg-white/65 p-4"
              >
                <p className="text-xs font-bold">
                  {worldQuantCompetencies[competency].shortLabel}
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.coveredConceptCount}/{summary.conceptCount}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#526276]">
                  {summary.activeQuestionCount} đang dùng ·{" "}
                  {summary.pendingQuestionCount} chờ duyệt ·{" "}
                  {summary.transferReadyConceptCount} sẵn sàng vận dụng
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/60 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                Danh sách chờ biên tập
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {editorialQueue.length} khái niệm chưa đủ học liệu để ôn và vận
                dụng
              </h2>
            </div>
            <p className="text-xs text-[#526276]">
              {coverage.unclassifiedQuestionIds.length} câu hỏi chưa được gắn
              với khái niệm
            </p>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {editorialQueue.map((item) => (
              <article
                key={item.concept.id}
                className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold">
                      {
                        worldQuantCompetencies[
                          item.concept.competency
                        ].shortLabel
                      }
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {item.concept.label}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#fee7e7] px-3 py-1 text-[10px] font-bold text-[#c43d3d]">
                    {coverageStatusLabels[item.status] ?? item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#526276]">
                  {item.concept.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                  <Pill>đang dùng {item.activeQuestionIds.length}</Pill>
                  <Pill>chờ duyệt {item.pendingQuestionIds.length}</Pill>
                  <Pill>bài luyện {item.practiceDrillIds.length}</Pill>
                  <Pill>
                    bài kiểm tra {item.checkpointDrillIds.length}
                  </Pill>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/admin"
                    className="rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white"
                  >
                    Mở danh sách chờ duyệt
                  </Link>
                  {item.concept.guideHref ? (
                    <Link
                      href={item.concept.guideHref}
                      className="rounded-xl border border-[#0f3a69]/15 px-4 py-2 text-xs font-bold"
                    >
                      Kiểm tra nguồn
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-20 rounded-xl bg-white/8 px-3 py-2.5">
      <p className="text-lg font-semibold text-[#65e6d2]">{value}</p>
      <p className="mt-0.5 text-[10px] text-white/60">{label}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#0f3a69]/10 bg-white px-2.5 py-1">
      {children}
    </span>
  );
}

function studioPriority(status: string) {
  return {
    pending_review: 0,
    content_gap: 1,
    drill_only: 2,
    flashcard_only: 3,
    transfer_ready: 4,
  }[status] ?? 5;
}
