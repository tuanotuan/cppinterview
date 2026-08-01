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
  ["cmake", "CMake"],
  ["python3", "Python 3"],
];

export function LessonLibraryApp({
  lessons,
}: {
  lessons: LessonLibraryItem[];
}) {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<"all" | ContentTrack>("all");
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
          <Link href="/learn" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91]">
              L
            </span>
            <span>
              <span className="block font-bold">Thư viện Recall</span>
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
            {lessons.length} bài từ nguồn project
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            Đọc kiến thức, xem mã, rồi luyện đúng thẻ của bài.
          </h1>
          <p className="mt-5 max-w-3xl leading-7 text-white/68">
            Bài học được lấy trực tiếp từ các tệp nguồn đã đăng ký. Câu hỏi
            nháp không xuất hiện như nội dung đã kiểm chứng.
          </p>
        </section>

        <section className="mt-6 grid gap-4 rounded-[1.75rem] border border-[#173f35]/12 bg-white/65 p-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:p-5">
          <label className="text-xs font-bold text-[#52645c]">
            Tìm bài học
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: lambda, pointer, CMake…"
              className="mt-2 min-h-12 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3 text-sm font-normal focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
            />
          </label>
          <label className="text-xs font-bold text-[#52645c]">
            Lộ trình
            <select
              value={track}
              onChange={(event) =>
                setTrack(event.target.value as "all" | ContentTrack)
              }
              className="mt-2 min-h-12 w-full rounded-xl border border-[#173f35]/15 bg-white px-4 py-3 text-sm font-normal focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
            >
              {tracks.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
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
