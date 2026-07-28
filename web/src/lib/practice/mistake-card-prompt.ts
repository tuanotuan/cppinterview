import type { GeneratedLesson, Question } from "@/lib/content/schema";

export function buildMistakeCardPrompt({
  criterion,
  evidence,
  occurrenceCount,
  question,
  lesson,
  sections,
}: {
  criterion: string;
  evidence: Record<string, unknown>;
  occurrenceCount: number;
  question: Question;
  lesson: GeneratedLesson;
  sections: GeneratedLesson["sections"];
}) {
  return [
    "Tạo đúng một thẻ ghi nhớ sửa lỗi bằng tiếng Việt cho người đang luyện phỏng vấn.",
    "Tập trung vào khái niệm còn thiếu nhưng không sao chép câu hỏi gốc.",
    "Chỉ dùng các đoạn trích bài học được cung cấp làm nguồn kiến thức.",
    "Với câu hỏi tình huống hoặc thiết kế, ưu tiên bối cảnh thực tế về giao dịch độ trễ thấp, tick data, sổ lệnh, luồng dữ liệu, kiểm thử hoặc môi trường vận hành khi nguồn có đề cập.",
    "Chỉ dùng responseMode=code khi câu trả lời thật sự cần viết mã; các trường hợp khác dùng text.",
    "Không để lộ đáp án trong đề bài, khung gợi ý hoặc gợi ý. Khung chỉ được chứa chữ ký hàm và TODO.",
    "Giữ thẻ đủ gọn để phù hợp với phương pháp lặp lại ngắt quãng.",
    "Dùng giọng thân thiện, xưng hô với người học là \"bạn\" và tránh chèn từ tiếng Anh không cần thiết.",
    "",
    `Tiêu chí còn thiếu: ${criterion}`,
    `Số lần ghi nhận: ${occurrenceCount}`,
    `Kết quả đánh giá an toàn: ${JSON.stringify(evidence)}`,
    `Câu hỏi gốc: ${question.prompt}`,
    `Bài học: ${lesson.title}`,
    "Đoạn trích làm nguồn:",
    ...sections.map(
      (section) =>
        `--- ${section.id}: ${section.heading}\n${section.bodyMarkdown}`,
    ),
  ].join("\n");
}
