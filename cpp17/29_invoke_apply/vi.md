# Ngày 29 — std::invoke và std::apply

## 1. Vấn đề nó giải quyết

Generic code cần gọi thống nhất function, function object, member function và member-data pointer. Argument giữ trong tuple cũng cần expand vào call mà không viết index thủ công.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết callable, member pointer, tuple, forwarding và variadic invocation.

## 3. Ý tưởng cốt lõi

`std::invoke` cài generalized call rule chuẩn cho callable thường và member. `std::apply` unpack phần tử tuple-like rồi invoke callable với chúng.

## 4. Cú pháp tối thiểu

```cpp
std::invoke(&Widget::scale, widget, 3);
std::apply(add, std::tuple{2, 5});
```

## 5. Cách nó hoạt động

1. Member function pointer được invoke trên object, member-data pointer được đọc và function thường nhận tuple element.
2. Thư viện chuẩn hóa các syntactic form khác nhau trong khi giữ result và argument category của callable.
3. Chương trình in `scaled: 21`, `member: 7` và `applied: 7`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Tuple element được truyền theo value category của tuple object; có thể vô tình copy hoặc move-from nếu hiểu sai forwarding.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi generic infrastructure nhận nhiều callable form hoặc argument tự nhiên nằm trong tuple.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ba lời gọi thể hiện member function, member data và tuple expansion mà không cần custom dispatch code.

## 9. Điều cần nhớ

- Dùng standard invocation model để wrapper nhất quán với trait như `std::is_invocable`.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::invoke và std::apply giải quyết vấn đề chính nào?
2. Trung bình — Object nào cung cấp `this` khi member function pointer được invoke?
3. Khó — Tuple value category ảnh hưởng reference được forward bởi `std::apply` thế nào?
