# Ngày 13 — Class template argument deduction

## 1. Vấn đề nó giải quyết

Dựng class template thường lặp type information đã rõ từ constructor argument. Class template argument deduction, hay CTAD, cho compiler suy ra template argument tại variable declaration.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết class template, constructor, function template deduction và initialization syntax.

## 3. Ý tưởng cốt lõi

Khi template name không có argument list trong declaration phù hợp, constructor và deduction guide tạo candidate. Candidate được chọn xác định specialization trước, rồi ordinary construction khởi tạo concrete type.

## 4. Cú pháp tối thiểu

```cpp
std::pair point{3, 4};
std::vector values{1, 2, 3};
```

## 5. Cách nó hoạt động

1. C++17 suy ra pair của integer và vector integer từ constructor argument dùng brace.
2. Implicit deduction candidate sinh từ constructor thư viện tham gia overload resolution trước khi từng object được khởi tạo.
3. Chương trình in `point: 3,4` và `sum: 6`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- CTAD không dùng được ở mọi type context và có thể suy ra element type ngoài ý muốn, nhất là với pointer, reference hay initializer-list constructor.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi constructor argument làm specialization dự kiến không mơ hồ và bỏ lặp giúp dễ đọc hơn.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Static assertion kiểm tra chính xác specialization của thư viện chuẩn, rồi program in value từ từng object.

## 9. Điều cần nhớ

- CTAD suy ra class specialization tại declaration; nó không biến class template thành runtime dynamic type.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Class template argument deduction giải quyết vấn đề chính nào?
2. Trung bình — Specialization nào được suy ra cho pair và vector trong ví dụ?
3. Khó — Vì sao initializer-list constructor có thể làm CTAD khác so với parentheses?
