import type { ContentQuestion } from "./schema";

export const questionTypeLabels: Record<ContentQuestion["type"], string> = {
  recall: "Ghi nhớ",
  code_reasoning: "Lập luận về mã",
  pitfall: "Bẫy thường gặp",
  scenario: "Tình huống",
};

export const questionDifficultyLabels: Record<
  ContentQuestion["difficulty"],
  string
> = {
  beginner: "Dễ",
  intermediate: "Trung bình",
  advanced: "Khó",
};

export const questionResponseModeLabels: Record<
  NonNullable<ContentQuestion["responseMode"]>,
  string
> = {
  text: "Text",
  code: "Code",
};

const taxonomyTopicLabels: Record<string, string> = {
  address: "Địa chỉ",
  aggregate: "Kiểu tổng hợp",
  algorithm: "Thuật toán",
  alias: "Tên thay thế",
  aliasing: "Nhiều tên cùng tham chiếu",
  alignment: "Căn chỉnh bộ nhớ",
  assignment: "Phép gán",
  array: "Mảng",
  assertion: "Điều kiện kiểm tra",
  "binary-parsing": "Phân tích dữ liệu nhị phân",
  bounds: "Giới hạn",
  callable: "Đối tượng có thể gọi",
  capture: "Bắt biến trong lambda",
  "class-design": "Thiết kế lớp",
  "compile-time": "Thời điểm biên dịch",
  constant: "Hằng",
  constraint: "Ràng buộc",
  const: "Tính bất biến",
  constructor: "Hàm tạo",
  container: "Cấu trúc chứa",
  copy: "Sao chép",
  "data-quality": "Chất lượng dữ liệu",
  enum: "Kiểu liệt kê",
  feed: "Nguồn dữ liệu",
  final: "Từ khóa final",
  "fixed-point": "Số học dấu phẩy tĩnh",
  "for-each": "Lặp qua từng phần tử",
  foundation: "Nền tảng",
  initialization: "Khởi tạo",
  "interval-statistics": "Thống kê theo khoảng",
  invariants: "Điều bất biến",
  iteration: "Phép lặp",
  lambda: "Biểu thức lambda",
  lifecycle: "Vòng đời hoạt động",
  lifetime: "Vòng đời đối tượng",
  lvalue: "Lvalue",
  "market-by-order": "Sổ lệnh theo từng lệnh",
  "market-by-price": "Sổ lệnh theo mức giá",
  "market-data": "Dữ liệu thị trường",
  memory: "Bộ nhớ",
  mutable: "Từ khóa mutable",
  mutation: "Thay đổi dữ liệu",
  narrowing: "Thu hẹp kiểu",
  "object-model": "Mô hình đối tượng",
  "order-book": "Sổ lệnh",
  overload: "Nạp chồng",
  override: "Ghi đè",
  ownership: "Quyền sở hữu",
  performance: "Hiệu năng",
  pointer: "Con trỏ",
  "pointer-arithmetic": "Số học con trỏ",
  priority: "Mức ưu tiên",
  readability: "Khả năng đọc hiểu",
  recovery: "Khôi phục",
  reference: "Tham chiếu",
  scope: "Phạm vi",
  sequencing: "Thứ tự dữ liệu",
  sort: "Sắp xếp",
  "special-member-function": "Hàm thành viên đặc biệt",
  struct: "Kiểu struct",
  templates: "Mẫu",
  "tick-data": "Dữ liệu tick",
  timestamps: "Dấu thời gian",
  "type-deduction": "Suy luận kiểu",
  "type-safety": "An toàn kiểu",
};

export function taxonomyTopicLabel(topic: string) {
  return taxonomyTopicLabels[topic] ?? topic;
}

export function hasTaxonomyTopicLabel(topic: string) {
  return Object.hasOwn(taxonomyTopicLabels, topic);
}
