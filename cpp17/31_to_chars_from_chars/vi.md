# Ngày 31 — std::to_chars và std::from_chars

## 1. Vấn đề nó giải quyết

Stream và conversion phụ thuộc locale có thể nặng hoặc khó dự đoán hơn nhu cầu parse số low-level. Character-conversion function thao tác trên buffer rõ, không allocation, locale hay exception.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết character buffer, half-open pointer range, base của integer, error code và `std::string_view`.

## 3. Ý tưởng cốt lõi

`std::to_chars` ghi digit vào `[first, last)` rồi trả end pointer cùng error code. `std::from_chars` parse từ range tương tự, báo nơi dừng và để caller xử lý error.

## 4. Cú pháp tối thiểu

```cpp
auto written = std::to_chars(first, last, value, 16);
auto parsed = std::from_chars(first, written.ptr, output, 16);
```

## 5. Cách nó hoạt động

1. Integer được convert thành hexadecimal lowercase trong fixed array, rồi exact range đã sinh được parse ngược.
2. Cả error code trả về và parse end pointer đều được check trước khi nhận reconstructed value.
3. Chương trình in `encoded: ff` và `parsed: 255`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Output không tự null-terminate, whitespace không được skip như stream, và partial parse phải phát hiện qua pointer trả về.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi code nhạy hiệu năng hoặc protocol tự quản buffer và cần numeric text độc lập locale.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

String view được dựng trực tiếp từ pointer range đã ghi. Parsing chỉ thành công nếu mọi character được consume.

## 9. Điều cần nhớ

- Character conversion là primitive nhỏ và rõ; sizing buffer cùng error check đầy đủ là hợp đồng của caller.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::to_chars và std::from_chars giải quyết vấn đề chính nào?
2. Trung bình — Vì sao không cần null terminator khi dựng view?
3. Khó — Parser phân biệt invalid input, overflow và valid numeric prefix theo sau bởi junk thế nào?
