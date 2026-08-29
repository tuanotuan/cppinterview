# Ngày 18 — if constexpr

## 1. Vấn đề nó giải quyết

Template có thể cần implementation khác nhau theo type category. `if` thường vẫn yêu cầu cả hai branch hợp lệ sau instantiation dù một branch không bao giờ chạy.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết function template, type trait, discarded statement và compile-time condition.

## 3. Ý tưởng cốt lõi

`if constexpr` evaluate constant condition khi instantiate và discard branch không được chọn. Dependent code không hợp lệ trong discarded branch không cần instantiate cho type đã chọn.

## 4. Cú pháp tối thiểu

```cpp
if constexpr (std::is_integral_v<T>) {
    return value + 1;
} else {
    return value.size();
}
```

## 5. Cách nó hoạt động

1. Template phân loại arithmetic và string value bằng expression riêng theo type.
2. Chỉ branch được chọn góp code cho mỗi specialization, nên operation chỉ dành cho string không bao giờ được tạo cho integer.
3. Chương trình in mô tả cho integer, floating-point value và string, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Syntax không dependent vẫn có thể bị diagnostic trong discarded branch; `if constexpr` không phải cơ chế comment-out tổng quát.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi một generic interface có implementation compile time thực sự khác theo capability hoặc category của type.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Classifier chỉ dùng operation hợp lệ cho từng type và trả string thường để branch selection nhìn thấy được.

## 9. Điều cần nhớ

- `if constexpr` chọn template code khi instantiation; nó không thêm runtime polymorphism.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — if constexpr giải quyết vấn đề chính nào?
2. Trung bình — Branch nào được instantiate cho `describe(3.5)`?
3. Khó — Vì sao một số error vẫn xuất hiện trong branch bị discard cho mọi lời gọi hiện tại?
