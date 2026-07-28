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
  title: "WorldQuant Curriculum Graph — Recall",
  description:
    "Bản đồ concept, prerequisite, flashcard coverage và transfer drill cho track C++ WorldQuant.",
};

const statusLabels = {
  transfer_ready: "Card + transfer",
  flashcard_only: "Chỉ có card",
  pending_review: "Chờ duyệt",
  drill_only: "Chỉ có drill",
  content_gap: "Thiếu content",
} as const;

const statusStyles = {
  transfer_ready: "bg-[#d7ff91] text-[#173f35]",
  flashcard_only: "bg-[#dcebe2] text-[#245748]",
  pending_review: "bg-[#f4dfaf] text-[#795517]",
  drill_only: "bg-[#dfe7f4] text-[#334e78]",
  content_gap: "bg-[#f1d6c9] text-[#8e3825]",
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
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link href="/worldquant" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              WQ
            </span>
            <span>
              <span className="block font-bold">Curriculum Graph</span>
              <span className="block text-xs text-[#64736c]">
                Content ≠ learner evidence
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            <HeaderLink
              href={worldQuantRoleHref("/worldquant", roleId)}
            >
              Readiness Hub
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/drills",
                roleId,
              )}
            >
              Scenario Lab
            </HeaderLink>
            <HeaderLink
              href={worldQuantRoleHref(
                "/worldquant/mission",
                roleId,
              )}
            >
              Today&apos;s Mission
            </HeaderLink>
            {cloud.account ? (
              <HeaderLink href="/admin/coverage">
                Coverage Studio
              </HeaderLink>
            ) : null}
          </nav>
        </header>

        <section className="grid gap-6 py-9 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
              Curriculum v1 · 30 concepts
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Học theo dependency, không học một đống thẻ rời.
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-[#64736c]">
              Card coverage, drill transfer và content chờ duyệt được
              hiển thị riêng. Một concept thiếu card không bị diễn giải
              thành mày yếu.
            </p>
          </div>
          <form>
            <label className="block text-xs font-bold text-[#64736c]">
              Role profile
              <select
                name="role"
                defaultValue={roleId}
                className="mt-2 w-full rounded-2xl border border-[#173f35]/15 bg-white px-4 py-3 text-sm font-bold"
              >
                {worldQuantRoleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="mt-3 w-full rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-white">
              Xem graph
            </button>
          </form>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {activeCompetencies.slice(0, 5).map((competency) => {
            const summary = coverage.competencies[competency];
            return (
              <div
                key={competency}
                className="rounded-2xl border border-[#173f35]/10 bg-white/65 p-4"
              >
                <p className="text-xs font-bold">
                  {worldQuantCompetencies[competency].shortLabel}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {summary.coveredConceptCount}/{summary.conceptCount}
                </p>
                <p className="mt-1 text-[11px] text-[#64736c]">
                  concept có card · {summary.transferReadyConceptCount} có
                  checkpoint
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
                className="rounded-[2rem] border border-[#173f35]/12 bg-white/60 p-5 shadow-[0_18px_70px_rgb(23_63_53_/_7%)] sm:p-7"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                      Role weight {role.weights[competency]}%
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {definition.label}
                    </h2>
                  </div>
                  <Link
                    href={`/worldquant/drills?role=${roleId}&competency=${competency}`}
                    className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white"
                  >
                    Luyện scenario
                  </Link>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {concepts.map((item, index) => (
                    <article
                      key={item.concept.id}
                      className="rounded-2xl border border-[#173f35]/10 bg-[#fbfaf4] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#173f35] font-mono text-[10px] font-bold text-white">
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
                      <p className="mt-2 text-sm leading-6 text-[#64736c]">
                        {item.concept.summary}
                      </p>
                      <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                        <Metric
                          label="Active cards"
                          value={item.activeQuestionIds.length}
                        />
                        <Metric
                          label="Pending"
                          value={item.pendingQuestionIds.length}
                        />
                        <Metric
                          label="Practice"
                          value={item.practiceDrillIds.length}
                        />
                        <Metric
                          label="Checkpoint"
                          value={item.checkpointDrillIds.length}
                        />
                      </dl>
                      <p className="mt-4 text-[10px] leading-4 text-[#64736c]">
                        Prerequisite:{" "}
                        {item.concept.prerequisites.length
                          ? item.concept.prerequisites.join(", ")
                          : "foundation"}
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
      <dt className="text-[#64736c]">{label}</dt>
      <dd className="mt-1 font-mono font-bold">{value}</dd>
    </div>
  );
}
