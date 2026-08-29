# Ngày 3 — Ôn auto, decltype, generic lambda và type deduction

## 1. Vấn đề nó giải quyết

Kiểu phụ thuộc dài làm mờ ý định, nhưng deduction bất cẩn có thể âm thầm copy hoặc bỏ qualifier. Công cụ suy luận kiểu giảm lặp chữ nhưng vẫn đòi hỏi hiểu chính xác reference và expression category.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết `const`, lvalue reference, function template và lambda capture cơ bản.

## 3. Ý tưởng cốt lõi

`auto` suy luận gần giống template và thường bỏ `const` cấp cao nhất cùng reference. `decltype(name)` giữ kiểu khai báo, còn parameter `auto` của generic lambda biến call operator thành function template.

## 4. Cú pháp tối thiểu

```cpp
const int value = 7;
auto copy = value;
decltype(value) exact = value;
auto twice = [](auto x) { return x + x; };
```

## 5. Cách nó hoạt động

1. Static assertion kiểm chứng kiểu value và reference được suy ra thay vì dựa vào cảm giác.
2. Generic lambda tạo call operator riêng cho đối số integer và floating-point rồi suy ra từng return expression.
3. Chương trình in `twice int: 10` và `twice double: 5`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- `auto` thường tạo bản sao khi có thể đang muốn alias; hãy chủ động chọn `auto&`, `const auto&` hoặc `decltype(auto)`.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi initializer hoặc lời gọi callable đã làm kiểu cụ thể rõ và ghi tay chỉ tạo nhiễu.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ví dụ kiểm chứng qualifier tại compile time rồi gọi cùng một generic lambda với hai kiểu số học. Input cố định giúp output dễ quan sát.

## 9. Điều cần nhớ

- Deduction làm khai báo ngắn hơn, nhưng giữ reference và conversion vẫn là quyết định thiết kế.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Ôn auto, decltype, generic lambda và type deduction giải quyết vấn đề chính nào?
2. Trung bình — Vì sao `copy` vẫn gán được dù initializer được khai báo `const`?
3. Khó — `decltype(x)` và `decltype((x))` khác nhau thế nào với named lvalue?
