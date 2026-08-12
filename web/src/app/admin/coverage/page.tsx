import type { Metadata } from "next";
import Link from "next/link";

import { loadCloudContext } from "@/lib/practice/cloud-server";
import { buildCurriculumEvidenceFromManifest } from "@/lib/worldquant/curriculum-evidence";
import {
  worldQuantCompetencies,
  worldQuantCompetencyKeys,
} from "@/lib/worldquant/readiness";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mức bao phủ nội dung — Recall",
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
  if (!cloud.enabled || !cloud.account) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <section className="max-w-lg rounded-[2rem] border border-[#173f35]/15 bg-white/70 p-8">
          <p className="font-mono text-xs font-bold text-[#ba4b2f] uppercase">
            Dành cho quản trị viên
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Bạn cần đăng nhập để xem mức bao phủ nội dung.
          </h1>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white"
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
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link
            href="/"
            aria-label="Về trang chủ Recall"
            title="Về trang chủ Recall"
            className="flex items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono font-bold text-[#d7ff91]">
              R
            </span>
            <span>
              <span className="block font-bold">Mức bao phủ nội dung</span>
              <span className="block text-xs text-[#64736c]">
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
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
            Ưu tiên bổ sung học liệu
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Ưu tiên duyệt những phần còn thiếu.
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-[#64736c]">
            Thẻ sửa lỗi cá nhân không được tính vào mức bao phủ nội dung. Bài
            luyện cũng không thay thế thẻ ghi nhớ đã duyệt; hai loại bằng
            chứng học tập được theo dõi riêng.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {worldQuantCompetencyKeys.map((competency) => {
            const summary = coverage.competencies[competency];
            return (
              <article
                key={competency}
                className="rounded-2xl border border-[#173f35]/10 bg-white/65 p-4"
              >
                <p className="text-xs font-bold">
                  {worldQuantCompetencies[competency].shortLabel}
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {summary.coveredConceptCount}/{summary.conceptCount}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#64736c]">
                  {summary.activeQuestionCount} đang dùng ·{" "}
                  {summary.pendingQuestionCount} chờ duyệt ·{" "}
                  {summary.transferReadyConceptCount} sẵn sàng vận dụng
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#173f35]/12 bg-white/60 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                Danh sách chờ biên tập
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {editorialQueue.length} khái niệm chưa đủ học liệu để ôn và vận
                dụng
              </h2>
            </div>
            <p className="text-xs text-[#64736c]">
              {coverage.unclassifiedQuestionIds.length} câu hỏi chưa được gắn
              với khái niệm
            </p>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {editorialQueue.map((item) => (
              <article
                key={item.concept.id}
                className="rounded-2xl border border-[#173f35]/10 bg-[#fbfaf4] p-4"
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
                  <span className="rounded-full bg-[#f1d6c9] px-3 py-1 text-[10px] font-bold text-[#8e3825]">
                    {coverageStatusLabels[item.status] ?? item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#64736c]">
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
                    className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
                  >
                    Mở danh sách chờ duyệt
                  </Link>
                  {item.concept.guideHref ? (
                    <Link
                      href={item.concept.guideHref}
                      className="rounded-xl border border-[#173f35]/15 px-4 py-2 text-xs font-bold"
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#173f35]/10 bg-white px-2.5 py-1">
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
