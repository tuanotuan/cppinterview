import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getRepoContentManifest } from "@/lib/content/question-store-server";
import {
  buildLessonLibrary,
  findLesson,
  lessonPracticeHref,
  lessonTrackLabel,
} from "@/lib/learn/lesson-library";

import { LessonMarkdown } from "../lesson-markdown";
import { LessonSelfCheck } from "../lesson-self-check";

export const dynamicParams = false;

export function generateStaticParams() {
  return getRepoContentManifest().lessons.map((lesson) => ({
    lessonId: lesson.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = findLesson(getRepoContentManifest(), lessonId);
  return lesson
    ? {
        title: `${lesson.title} — cppinterview`,
        description: `Bài học ${lessonTrackLabel(lesson.track)} với mã mẫu và thẻ ghi nhớ liên quan.`,
      }
    : {};
}

export default async function LessonReaderPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const manifest = getRepoContentManifest();
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
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <Link
            href="/"
            aria-label="Về trang chủ cppinterview"
            title="Về trang chủ cppinterview"
            className="flex items-center gap-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              L
            </span>
            <span>
              <span className="block font-bold">Thư viện cppinterview</span>
              <span className="block text-xs text-[#64736c]">
                {lessonTrackLabel(lesson.track)}
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/learn">
              Tất cả bài học
            </Link>
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/mock-interview">
              Phỏng vấn thử
            </Link>
          </nav>
        </header>

        <section className="mt-7 rounded-[2.25rem] bg-[#173f35] p-6 text-white shadow-[0_24px_90px_rgb(23_63_53_/_16%)] sm:p-10">
          <div className="flex flex-wrap gap-2 font-mono text-[10px] font-bold uppercase">
            <span className="rounded-full bg-[#d7ff91] px-3 py-1 text-[#173f35]">
              {lessonTrackLabel(lesson.track)}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Bài {lesson.order}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              {lesson.sections.length} phần
            </span>
          </div>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            {lesson.title}
          </h1>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={lessonPracticeHref(lesson)}
              className="inline-flex min-h-12 items-center rounded-xl bg-[#d7ff91] px-5 py-3 text-sm font-bold text-[#173f35]"
            >
              Luyện thẻ của bài này
            </Link>
            {lesson.code ? (
              <a
                href="#code-sample"
                className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white"
              >
                Xem mã mẫu
              </a>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-white/55">
            {libraryItem.verifiedQuestionCount
              ? `${libraryItem.verifiedQuestionCount} câu hỏi trong repo đã được kiểm chứng cho bài này.`
              : "Kho hiện chưa có câu kiểm tra đã duyệt cho bài này; đây là giới hạn học liệu, không phải kết quả học của bạn."}
          </p>
        </section>

        <div className="mt-7 grid items-start gap-7 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[1.75rem] border border-[#173f35]/12 bg-white/60 p-4 xl:sticky xl:top-5">
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#64736c] uppercase">
              Nội dung bài
            </p>
            <nav className="mt-3 space-y-1">
              {lesson.sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-xl px-3 py-2 text-xs font-semibold text-[#52645c] hover:bg-white hover:text-[#245748]"
                >
                  {index + 1}. {section.heading}
                </a>
              ))}
              {lesson.code ? (
                <a
                  href="#code-sample"
                  className="block rounded-xl px-3 py-2 text-xs font-semibold text-[#52645c] hover:bg-white hover:text-[#245748]"
                >
                  Mã mẫu
                </a>
              ) : null}
              <a
                href="#self-check"
                className="block rounded-xl px-3 py-2 text-xs font-semibold text-[#52645c] hover:bg-white hover:text-[#245748]"
              >
                Tự kiểm tra
              </a>
            </nav>

            <div className="mt-5 border-t border-[#173f35]/10 pt-4">
              <p className="text-xs font-bold text-[#52645c]">Cần học trước</p>
              {lesson.prerequisites.length ? (
                <div className="mt-2 space-y-2">
                  {lesson.prerequisites.map((prerequisiteId) => (
                    <Link
                      key={prerequisiteId}
                      href={`/learn/${prerequisiteId}`}
                      className="block text-xs font-semibold text-[#245748] underline decoration-[#79b82a] underline-offset-4"
                    >
                      {titleById.get(prerequisiteId) ?? prerequisiteId}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#64736c]">
                  Không có bài bắt buộc.
                </p>
              )}
            </div>
          </aside>

          <article className="min-w-0 space-y-5">
            {lesson.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-5 rounded-[2rem] border border-[#173f35]/12 bg-white/65 p-5 shadow-[0_16px_60px_rgb(23_63_53_/_6%)] sm:p-8"
              >
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                  Phần {index + 1}
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
                className="scroll-mt-5 overflow-hidden rounded-[2rem] border border-[#173f35]/12 bg-[#0b241d]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white sm:px-7">
                  <div>
                    <p className="font-mono text-xs font-bold text-[#d7ff91]">
                      Mã mẫu hoàn chỉnh
                    </p>
                    <p className="mt-1 text-[10px] text-white/45">
                      {lesson.codePath}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px]">
                    C++
                  </span>
                </div>
                <pre className="max-h-[42rem] overflow-auto p-5 font-mono text-[12px] leading-6 text-[#e8f4ec] sm:p-7">
                  <code>{lesson.code}</code>
                </pre>
              </section>
            ) : null}

            <section
              id="self-check"
              className="scroll-mt-5 rounded-[2rem] border border-[#356b58]/18 bg-[#eef6e7] p-5 sm:p-8"
            >
              <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
                Tự kiểm tra · không chấm điểm
              </p>
              <h2 className="mt-2 mb-5 text-2xl font-semibold tracking-tight">
                Bạn đã hiểu những điểm nào?
              </h2>
              <LessonSelfCheck items={lesson.checklistItems} />
            </section>

            <nav className="grid gap-3 sm:grid-cols-2" aria-label="Bài học liền kề">
              {previous ? (
                <Link
                  href={`/learn/${previous.id}`}
                  className="rounded-2xl border border-[#173f35]/12 bg-white/65 p-4 text-sm font-bold"
                >
                  ← {previous.title}
                </Link>
              ) : <span />}
              {next ? (
                <Link
                  href={`/learn/${next.id}`}
                  className="rounded-2xl border border-[#173f35]/12 bg-white/65 p-4 text-right text-sm font-bold"
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
