# Ngày 32 — std::filesystem

## 1. Vấn đề nó giải quyết

Path manipulation và directory operation portable trước đây phụ thuộc platform API hoặc third-party library. C++17 chuẩn hóa path, status query, iteration và file operation thông dụng.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết path component, relative với absolute path, error handling và khác biệt giữa lexical operation với filesystem operation.

## 3. Ý tưởng cốt lõi

`std::filesystem::path` lưu path theo native model của platform và cung cấp operation hiểu component. Method như `lexically_normal` đổi syntax mà không chạm filesystem, còn query và mutation có thể lỗi bằng exception hoặc `std::error_code`.

## 4. Cú pháp tối thiểu

```cpp
namespace fs = std::filesystem;
fs::path path{"logs/../data/report.txt"};
auto normalized = path.lexically_normal();
```

## 5. Cách nó hoạt động

1. Relative path chứa parent component được normalize hoàn toàn trong memory.
2. Member function hiểu component lấy filename, stem, extension và tạo changed copy mà không giả định slash character.
3. Chương trình in generic path string đã normalize và replace extension, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Lexical normalization không resolve symbolic link hay chứng minh path tồn tại; canonicalization nhạy security phải xét state thật và race.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi code cần construction, inspection, traversal hoặc file operation portable và hiểu path component.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ví dụ không write bên ngoài nên xác định, nhưng vẫn thể hiện path join, normalization, filename access và replace extension.

## 9. Điều cần nhớ

- Xem path là structured value và tách lexical transformation khỏi query phụ thuộc filesystem.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::filesystem giải quyết vấn đề chính nào?
2. Trung bình — `lexically_normal` có kiểm tra normalized path tồn tại không?
3. Khó — Khi nào operation nên dùng overload `error_code` thay vì exception?
