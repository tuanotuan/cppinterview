import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { localizedAlternates } from "@/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { localizeContentManifest } from "@/lib/content/translations";
import { getRepoContentManifest } from "@/lib/content/question-store-server";
import {
  buildLessonLibrary,
  findLesson,
  lessonPracticeHref,
  lessonTrackLabel,
} from "@/lib/learn/lesson-library";

import { LessonMarkdown } from "../../../learn/lesson-markdown";
import { LessonSelfCheck } from "../../../learn/lesson-self-check";

export const dynamicParams = false;

export function generateStaticParams() {
  return getRepoContentManifest().lessons.map((lesson) => ({
    lessonId: lesson.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; lessonId: string }>;
}): Promise<Metadata> {
  const { locale, lessonId } = await params;
  const lesson = findLesson(getRepoContentManifest(), lessonId);
  const t = await getTranslations({ locale, namespace: "Learn.reader" });
  return lesson
    ? {
        title: `${lesson.title} — cppinterview`,
        description: t("metaDescription", {
          track: lessonTrackLabel(lesson.track),
        }),
        alternates: localizedAlternates(`/learn/${lessonId}`, locale),
      }
    : {};
}

export default async function LessonReaderPage({
  params,
}: {
  params: Promise<{ locale: Locale; lessonId: string }>;
}) {
  const { locale, lessonId } = await params;
  const t = await getTranslations("Learn");
  const common = await getTranslations("Common");
  const manifest = localizeContentManifest(getRepoContentManifest(), locale);
  const lesson = findLesson(manifest, lessonId);
  if (!lesson) notFound();

  const library = buildLessonLibrary(manifest);
  const itemIndex = library.findIndex((item) => item.id === lesson.id);
  const libraryItem = library[itemIndex];
  const previous = itemIndex > 0 ? library[itemIndex - 1] : null;
  const next = itemIndex < library.length - 1 ? library[itemIndex + 1] : null;
  const titleById = new Map(
    manifest.lessons.map((item) => [item.id, item.title]),
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1380px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0f3a69]/15 pb-5">
          <Link
            href="/"
            aria-label={common("homeAria")}
            title={common("homeAria")}
            className="flex items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#0f3a69] font-mono text-sm font-bold text-[#65e6d2]">
              L
            </span>
            <span>
              <span className="block font-bold">{t("brand")}</span>
              <span className="block text-xs text-[#526276]">
                {lessonTrackLabel(lesson.track)}
              </span>
            </span>
          </Link>
          <nav aria-label={t("navAria")} className="flex flex-wrap gap-2 text-sm font-bold">
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/learn">
              {t("reader.allLessons")}
            </Link>
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/mock-interview">
              {t("mock")}
            </Link>
          </nav>
        </header>

        <section className="mt-7 rounded-[1.25rem] bg-[#0f3a69] p-6 text-white shadow-[0_24px_90px_rgb(15_58_105_/_16%)] sm:p-10">
          <div className="flex flex-wrap gap-2 font-mono text-[10px] font-bold uppercase">
            <span className="rounded-full bg-[#65e6d2] px-3 py-1 text-[#0f3a69]">
              {lessonTrackLabel(lesson.track)}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              {t("reader.lesson", { number: lesson.order })}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              {t("sections", { count: lesson.sections.length })}
            </span>
          </div>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            {lesson.title}
          </h1>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={lessonPracticeHref(lesson)}
              className="inline-flex min-h-12 items-center rounded-xl bg-[#65e6d2] px-5 py-3 text-sm font-bold text-[#0f3a69]"
            >
              {t("reader.practice")}
            </Link>
            {lesson.code ? (
              <a
                href="#code-sample"
                className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white"
              >
                {t("reader.viewCode")}
              </a>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-white/55">
            {libraryItem.verifiedQuestionCount
              ? t("reader.verifiedAvailable", {
                  count: libraryItem.verifiedQuestionCount,
                })
              : t("reader.noVerified")}
          </p>
        </section>

        <div className="mt-7 grid items-start gap-7 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-[#0f3a69]/12 bg-white/60 p-4 xl:sticky xl:top-5">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#526276] uppercase">
              {t("reader.contents")}
            </p>
            <nav className="mt-3 space-y-1">
              {lesson.sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-xl px-3 py-2 text-xs font-semibold text-[#43546a] hover:bg-white hover:text-[#16865a]"
                >
                  {index + 1}. {section.heading}
                </a>
              ))}
              {lesson.code ? (
                <a
                  href="#code-sample"
                  className="block rounded-xl px-3 py-2 text-xs font-semibold text-[#43546a] hover:bg-white hover:text-[#16865a]"
                >
                  {t("reader.sampleCode")}
                </a>
              ) : null}
              <a
                href="#self-check"
                className="block rounded-xl px-3 py-2 text-xs font-semibold text-[#43546a] hover:bg-white hover:text-[#16865a]"
              >
                {t("reader.selfCheck")}
              </a>
            </nav>

            <div className="mt-5 border-t border-[#0f3a69]/10 pt-4">
              <p className="text-xs font-bold text-[#43546a]">{t("reader.prerequisites")}</p>
              {lesson.prerequisites.length ? (
                <div className="mt-2 space-y-2">
                  {lesson.prerequisites.map((prerequisiteId) => (
                    <Link
                      key={prerequisiteId}
                      href={`/learn/${prerequisiteId}`}
                      className="block text-xs font-semibold text-[#16865a] underline decoration-[#138f8c] underline-offset-4"
                    >
                      {titleById.get(prerequisiteId) ?? prerequisiteId}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#526276]">
                  {t("reader.noPrerequisites")}
                </p>
              )}
            </div>
          </aside>

          <article className="min-w-0 space-y-5">
            {lesson.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-5 rounded-[1.25rem] border border-[#0f3a69]/12 bg-white/65 p-5 shadow-[0_16px_60px_rgb(15_58_105_/_6%)] sm:p-8"
              >
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#a65c0e] uppercase">
                  {t("reader.section", { number: index + 1 })}
                </p>
                <h2 className="mt-2 mb-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {section.heading}
                </h2>
                <LessonMarkdown markdown={section.bodyMarkdown} />
              </section>
            ))}

            {lesson.code ? (
              <section
                id="code-sample"
                className="scroll-mt-5 overflow-hidden rounded-[1.25rem] border border-[#0f3a69]/12 bg-[#092c51]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white sm:px-7">
                  <div>
                    <p className="font-mono text-xs font-bold text-[#65e6d2]">
                      {t("reader.completeCode")}
                    </p>
                    <p className="mt-1 text-[10px] text-white/45">
                      {lesson.codePath}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px]">
                    C++
                  </span>
                </div>
                <pre className="max-h-[42rem] overflow-auto p-5 font-mono text-[12px] leading-6 text-[#e6f8f5] sm:p-7">
                  <code>{lesson.code}</code>
                </pre>
              </section>
            ) : null}

            <section
              id="self-check"
              className="scroll-mt-5 rounded-[1.25rem] border border-[#285f86]/18 bg-[#e6f8f5] p-5 sm:p-8"
            >
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#285f86] uppercase">
                {t("reader.selfCheckEyebrow")}
              </p>
              <h2 className="mt-2 mb-5 text-2xl font-semibold tracking-tight">
                {t("reader.selfCheckTitle")}
              </h2>
              <LessonSelfCheck items={lesson.checklistItems} />
            </section>

            <nav className="grid gap-3 sm:grid-cols-2" aria-label={t("reader.adjacentAria")}>
              {previous ? (
                <Link
                  href={`/learn/${previous.id}`}
                  className="rounded-2xl border border-[#0f3a69]/12 bg-white/65 p-4 text-sm font-bold"
                >
                  ← {previous.title}
                </Link>
              ) : <span />}
              {next ? (
                <Link
                  href={`/learn/${next.id}`}
                  className="rounded-2xl border border-[#0f3a69]/12 bg-white/65 p-4 text-right text-sm font-bold"
                >
                  {next.title} →
                </Link>
              ) : null}
            </nav>
          </article>
        </div>
      </div>
    </main>
  );
}
