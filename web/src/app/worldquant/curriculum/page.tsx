import type { Metadata } from "next";
import Link from "next/link";

import { loadCloudContext } from "@/lib/practice/cloud-server";
import { buildCurriculumEvidenceFromManifest } from "@/lib/worldquant/curriculum-evidence";
import { worldQuantRoleHref } from "@/lib/worldquant/navigation";
import {
  worldQuantCompetencies,
  worldQuantRoleProfileById,
  worldQuantRoleProfiles,
  parseWorldQuantRoleProfile,
} from "@/lib/worldquant/readiness";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lộ trình kiến thức WorldQuant — cppinterview",
  description:
    "Bản đồ khái niệm, kiến thức nền, mức bao phủ thẻ ghi nhớ và bài luyện vận dụng cho lộ trình C++ WorldQuant.",
};

const statusLabels = {
  transfer_ready: "Có thẻ + bài vận dụng",
  flashcard_only: "Chỉ có thẻ",
  pending_review: "Chờ duyệt",
  drill_only: "Chỉ có bài luyện",
  content_gap: "Thiếu học liệu",
} as const;

const statusStyles = {
  transfer_ready: "bg-[#65e6d2] text-[#0f3a69]",
  flashcard_only: "bg-[#e6f8f5] text-[#16865a]",
  pending_review: "bg-[#f4dfaf] text-[#795517]",
  drill_only: "bg-[#dfe7f4] text-[#334e78]",
  content_gap: "bg-[#fee7e7] text-[#c43d3d]",
} as const;

export default async function WorldQuantCurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const cloud = await loadCloudContext({
    includeAiUsage: false,
    includeDailyAiBudget: false,
    includeGeminiUsage: false,
    includeProviderSettings: false,
  });
  const params = await searchParams;
  const roleParam = Array.isArray(params.role)
    ? params.role[0]
    : params.role;
  const roleId = parseWorldQuantRoleProfile(roleParam);
  const role = worldQuantRoleProfileById(roleId);
  const coverage = buildCurriculumEvidenceFromManifest({
    manifest: cloud.manifest,
    approvals: cloud.approvals,
    mistakeQuestionIds: cloud.mistakeQuestionIds,
  });
  const activeCompetencies = Object.entries(role.weights)
    .filter(([, weight]) => weight > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([competency]) => competency as keyof typeof role.weights);

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
            <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2]">
              WQ
            </span>
            <span>
              <span className="block font-bold">Lộ trình kiến thức</span>
              <span className="block text-xs text-[#526276]">
                Mức độ đầy đủ của học liệu khác với mức độ thành thạo
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            <HeaderLink
              href={worldQuantRoleHref("/worldquant", roleId)}
            >
              Trung tâm chuẩn bị
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/drills",
                roleId,
              )}
            >
              Phòng luyện tình huống
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/mission",
                roleId,
              )}
            >
              Nhiệm vụ hôm nay
            </HeaderLink>
            {cloud.account ? (
              <HeaderLink href="/admin/coverage">
                Quản lý mức bao phủ
              </HeaderLink>
            ) : null}
          </nav>
        </header>

        <section className="grid gap-6 py-9 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#a65c0e] uppercase">
              Lộ trình v1 · 30 khái niệm
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Học theo kiến thức nền, không học một tập thẻ rời rạc.
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-[#526276]">
              Mức bao phủ thẻ, bài luyện vận dụng và học liệu chờ duyệt được
              hiển thị riêng. Một khái niệm thiếu thẻ không đồng nghĩa với
              việc bạn còn yếu.
            </p>
          </div>
          <form>
            <label className="block text-xs font-bold text-[#526276]">
              Vị trí mục tiêu
              <select
                name="role"
                defaultValue={roleId}
                className="mt-2 w-full rounded-2xl border border-[#0f3a69]/15 bg-white px-4 py-3 text-sm font-bold"
              >
                {worldQuantRoleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="mt-3 w-full rounded-xl bg-[#0f3a69] px-4 py-2 text-sm font-bold text-white">
              Xem lộ trình
            </button>
          </form>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {activeCompetencies.slice(0, 5).map((competency) => {
            const summary = coverage.competencies[competency];
            return (
              <div
                key={competency}
                className="rounded-2xl border border-[#0f3a69]/10 bg-white/65 p-4"
              >
                <p className="text-xs font-bold">
                  {worldQuantCompetencies[competency].shortLabel}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {summary.coveredConceptCount}/{summary.conceptCount}
                </p>
                <p className="mt-1 text-[11px] text-[#526276]">
                  khái niệm có thẻ · {summary.transferReadyConceptCount} có
                  bài kiểm tra xác nhận
                </p>
              </div>
            );
          })}
        </section>

        <div className="mt-6 space-y-5">
          {activeCompetencies.map((competency) => {
            const definition = worldQuantCompetencies[competency];
            const concepts = coverage.concepts.filter(
              (item) => item.concept.competency === competency,
            );
            return (
              <section
                key={competency}
                className="rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/60 p-5 shadow-[0_18px_70px_rgb(15_58_105_/_7%)] sm:p-7"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                      Mức độ quan trọng với vị trí {role.weights[competency]}%
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {definition.label}
                    </h2>
                  </div>
                  <Link
                    href={`/worldquant/drills?role=${roleId}&competency=${competency}`}
                    className="rounded-xl bg-[#0f3a69] px-4 py-2 text-xs font-bold text-white"
                  >
                    Luyện tình huống
                  </Link>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {concepts.map((item, index) => (
                    <article
                      key={item.concept.id}
                      className="rounded-2xl border border-[#0f3a69]/10 bg-[#f8fafc] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0f3a69] font-mono text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles[item.status]}`}
                        >
                          {statusLabels[item.status]}
                        </span>
                      </div>
                      <h3 className="mt-4 font-semibold">
                        {item.concept.label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#526276]">
                        {item.concept.summary}
                      </p>
                      <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                        <Metric
                          label="Thẻ đang dùng"
                          value={item.activeQuestionIds.length}
                        />
                        <Metric
                          label="Chờ duyệt"
                          value={item.pendingQuestionIds.length}
                        />
                        <Metric
                          label="Bài luyện"
                          value={item.practiceDrillIds.length}
                        />
                        <Metric
                          label="Bài xác nhận"
                          value={item.checkpointDrillIds.length}
                        />
                      </dl>
                      <p className="mt-4 text-[10px] leading-4 text-[#526276]">
                        Kiến thức nền:{" "}
                        {item.concept.prerequisites.length
                          ? item.concept.prerequisites.join(", ")
                          : "nền tảng ban đầu"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-white/60"
    >
      {children}
    </Link>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white/70 p-2">
      <dt className="text-[#526276]">{label}</dt>
      <dd className="mt-1 font-mono font-bold">{value}</dd>
    </div>
  );
}
