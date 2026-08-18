"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  lessonTrackLabel,
  type LessonLibraryItem,
} from "@/lib/learn/lesson-library";
import type { ContentTrack } from "@/lib/content/schema";

const tracks: Array<["all" | ContentTrack, string]> = [
  ["all", "Tất cả"],
  ["cpp98", "C++98"],
  ["cpp11", "C++11/14/17"],
  ["cpp20", "C++20/23"],
];

export function LessonLibraryApp({
  lessons,
}: {
  lessons: LessonLibraryItem[];
}) {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<"all" | ContentTrack>("all");
  const verifiedQuestionCount = lessons.reduce(
    (total, lesson) => total + lesson.verifiedQuestionCount,
    0,
  );
  const codeLessonCount = lessons.filter((lesson) => lesson.hasCode).length;
  const visibleLessons = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return lessons.filter(
      (lesson) =>
        (track === "all" || lesson.track === track) &&
        (!normalized ||
          [
            lesson.title,
            lesson.id,
            lessonTrackLabel(lesson.track),
            ...lesson.tags,
          ]
            .join(" ")
            .toLocaleLowerCase("vi")
            .includes(normalized)),
    );
  }, [lessons, query, track]);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
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
                Học trước, nhớ lâu sau
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/worldquant">
              Trung tâm chuẩn bị
            </Link>
            <Link className="rounded-xl px-4 py-2 hover:bg-white/60" href="/">
              Luyện thẻ
            </Link>
          </nav>
        </header>

        <section className="mt-7 rounded-[2.25rem] bg-[#173f35] p-6 text-white shadow-[0_24px_90px_rgb(23_63_53_/_16%)] sm:p-10">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#d7ff91] uppercase">
            Thư viện học tập
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            Đọc kiến thức, xem mã, rồi luyện đúng thẻ của bài.
          </h1>
          <p className="mt-5 max-w-3xl leading-7 text-white/68">
            Bài học được lấy trực tiếp từ các tệp nguồn đã đăng ký. Câu hỏi
            nháp không xuất hiện như nội dung đã kiểm chứng.
          </p>
          <div className="mt-7 grid max-w-2xl grid-cols-3 gap-2">
            <LibraryMetric label="Bài học" value={lessons.length} />
            <LibraryMetric label="Thẻ đã duyệt" value={verifiedQuestionCount} />
            <LibraryMetric label="Bài có mã" value={codeLessonCount} />
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-[#173f35]/12 bg-white/65 p-4 sm:p-5">
          <label className="text-xs font-bold text-[#52645c]">
            Tìm bài học
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: lambda, pointer, ownership…"
              className="mt-2 min-h-12 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3 text-sm font-normal focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
            />
          </label>
          <div className="mt-4 border-t border-[#173f35]/10 pt-4">
            <p className="text-xs font-bold text-[#52645c]">Lọc theo lộ trình</p>
            <div
              role="group"
              aria-label="Lọc theo lộ trình"
              className="mt-2 flex flex-wrap gap-2"
            >
              {tracks.map(([value, label]) => {
                const active = track === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTrack(value)}
                    className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                      active
                        ? "bg-[#173f35] text-[#d7ff91]"
                        : "border border-[#173f35]/15 bg-white text-[#52645c] hover:border-[#356b58]/35 hover:text-[#173f35]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-live="polite" className="py-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              Danh sách bài học
            </h2>
            <span className="font-mono text-xs text-[#64736c]">
              {visibleLessons.length} kết quả
            </span>
          </div>
          {visibleLessons.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${lesson.id}`}
                  className="group rounded-[1.75rem] border border-[#173f35]/12 bg-white/65 p-5 transition hover:-translate-y-0.5 hover:border-[#356b58]/35 hover:bg-white focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eaf8cf] px-3 py-1 font-mono text-[10px] font-bold text-[#245748]">
                      {lessonTrackLabel(lesson.track)}
                    </span>
                    <span className="font-mono text-[10px] text-[#64736c]">
                      Bài {lesson.order}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight group-hover:text-[#245748]">
                    {lesson.title}
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold text-[#64736c]">
                    <span>{lesson.sectionCount} phần</span>
                    <span>•</span>
                    <span>{lesson.hasCode ? "Có mã mẫu" : "Chỉ ghi chú"}</span>
                    <span>•</span>
                    <span>
                      {lesson.verifiedQuestionCount} câu đã kiểm chứng
                    </span>
                  </div>
                  {lesson.prerequisiteIds.length ? (
                    <p className="mt-4 text-xs leading-5 text-[#64736c]">
                      Cần học trước: {lesson.prerequisiteIds.join(", ")}
                    </p>
                  ) : (
                    <p className="mt-4 text-xs text-[#356b58]">
                      Có thể bắt đầu ngay
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#173f35]/20 p-8 text-center text-sm text-[#64736c]">
              Không có bài nào khớp bộ lọc hiện tại.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function LibraryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
      <p className="text-2xl font-semibold text-[#d7ff91]">{value}</p>
      <p className="mt-1 text-[10px] font-bold tracking-[0.08em] text-white/55 uppercase">
        {label}
      </p>
    </div>
  );
}
