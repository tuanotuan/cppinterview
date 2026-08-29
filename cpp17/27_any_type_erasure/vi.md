# Ngày 27 — std::any và type erasure

## 1. Vấn đề nó giải quyết

Một số extension hoặc metadata boundary cần mang copyable value mà receiving container chưa biết type. `std::any` xóa concrete type khỏi interface nhưng giữ runtime type checking an toàn.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết static type, runtime type information, copy, exception và pointer-style checked access.

## 3. Ý tưởng cốt lõi

Any sở hữu một copyable object hoặc rỗng. `std::any_cast<T>` lấy exact stored type; dạng value/reference throw khi mismatch, còn dạng pointer trả null.

## 4. Cú pháp tối thiểu

```cpp
std::any value = std::string{"C++17"};
if (const auto* text = std::any_cast<std::string>(&value)) {
    use(*text);
}
```

## 5. Cách nó hoạt động

1. Any ban đầu lưu integer rồi được assign owned string object.
2. Pointer cast test runtime type không cần exception, và program chỉ in sau mỗi exact match.
3. Chương trình in `integer: 42`, `text: C++17` và integer check false, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Cast thường xuyên và stored type không được document chuyển error từ compile time sang runtime; variant tốt hơn khi alternative set đóng.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi boundary mở cần sở hữu heterogeneous copyable value và runtime discovery là chủ đích.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ví dụ đổi erased type và dùng pointer cast không throw, làm successful và failed type test rõ ràng.

## 9. Điều cần nhớ

- Type erasure đổi compile-time knowledge lấy interface flexibility; giữ storage protocol nhỏ và có tài liệu.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::any và type erasure giải quyết vấn đề chính nào?
2. Trung bình — Dạng pointer của `any_cast<int>` trả gì sau khi lưu string?
3. Khó — Vì sao `std::any` không thể lưu trực tiếp move-only value thường trong C++17?
