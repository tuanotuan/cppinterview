# Ngày 34 — format, vformat và custom formatter

## 1. Vấn đề nó giải quyết

Formatting library tách message template khỏi giá trị, hỗ trợ runtime format argument store và cho user type định nghĩa quy tắc format. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Chuỗi, variadic argument và stream output.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Format string là khuôn, argument điền vào ô; `vformat` nhận pack đã type-erase, còn formatter dạy khuôn cách xử lý custom type. Hãy đọc `std::format` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::string text = std::format("value = {}", value);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::format`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Format string và argument phải khớp; parser của custom formatter phải tuân protocol. Hỗ trợ standard library có thể chậm hơn C++20 language mode.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi cần ghép văn bản có cấu trúc dễ đọc mà không dùng chuỗi stream dài.
- Tránh dùng khi standard library triển khai chưa có `<format>` hoặc stream đơn giản đã đủ.

## 8. Ví dụ đơn giản

Source có guard và thực thi `format`, `vformat` cùng custom formatter; GCC 13.3/libstdc++ hiện tại chạy đầy đủ nhánh formatting. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::format` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::format` trong ví dụ tối thiểu là gì?
2. Trung bình — Khác biệt chức năng giữa truyền argument trực tiếp cho `format` và truyền argument store cho `vformat` là gì?
3. Khó — Vì sao compiler hỗ trợ `-std=c++20` nhưng standard library đi kèm vẫn có thể thiếu implementation `<format>` hoàn chỉnh?
