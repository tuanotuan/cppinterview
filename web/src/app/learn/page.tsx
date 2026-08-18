import type { Metadata } from "next";

import { getRepoContentManifest } from "@/lib/content/question-store-server";
import { buildLessonLibrary } from "@/lib/learn/lesson-library";

import { LessonLibraryApp } from "./lesson-library-app";

export const metadata: Metadata = {
  title: "Thư viện bài học — cppinterview",
  description:
    "Đọc bài C++ theo thứ tự, xem mã mẫu và mở đúng thẻ ghi nhớ của từng bài.",
};

export default function LessonLibraryPage() {
  const manifest = getRepoContentManifest();
  return <LessonLibraryApp lessons={buildLessonLibrary(manifest)} />;
}
