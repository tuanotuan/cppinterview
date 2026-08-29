# Ngày 12 — [[nodiscard]], [[maybe_unused]], [[fallthrough]] và __has_include

## 1. Vấn đề nó giải quyết

API cần cách portable để báo ignored result, intentional non-use, switch fallthrough có chủ đích và khả năng có optional header cho compiler lẫn người đọc.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết compiler diagnostic, preprocessor condition, return value và control flow của switch.

## 3. Ý tưởng cốt lõi

Standard attribute thêm ý định semantic mà không đổi execution thành công. `[[nodiscard]]` yêu cầu warning khi bỏ result, `[[maybe_unused]]` đánh dấu unused có chủ đích, `[[fallthrough]]` đánh dấu chuyển case, còn `__has_include` test header.

## 4. Cú pháp tối thiểu

```cpp
[[nodiscard]] int status();
[[maybe_unused]] const int debug_id = 7;
case 1: prepare(); [[fallthrough]];
#if __has_include(<optional>)
```

## 5. Cách nó hoạt động

1. Preprocessor phát hiện `<optional>`, còn declaration mang ba standard attribute trong context hợp lệ.
2. Nodiscard result được dùng, debug value unused được đánh dấu chủ đích, và switch fallthrough tới xử lý chung mà không warning.
3. Chương trình in `optional header: 1`, `status: 0` và `level: 10`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Attribute không phải runtime enforcement: diagnostic có thể bị bỏ qua, còn `__has_include` chỉ chứng minh header tồn tại chứ không chứng minh API đầy đủ.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi ý định có thể được diagnostic kiểm tra hoặc cần chọn optional compilation path portable.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Mọi construct được dùng mà không cố tạo warning, nên file vẫn sạch với warning flag của khóa học.

## 9. Điều cần nhớ

- Attribute cải thiện hợp đồng compiler-reader; feature-test macro và header check nên bảo vệ quyết định portability.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — [[nodiscard]], [[maybe_unused]], [[fallthrough]] và __has_include giải quyết vấn đề chính nào?
2. Trung bình — Warning nào được yêu cầu nếu bỏ return từ function nodiscard?
3. Khó — Vì sao standard feature-test macro thường là bằng chứng mạnh hơn chỉ dùng `__has_include`?
