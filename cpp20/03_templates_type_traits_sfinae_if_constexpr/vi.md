# Ngày 3 — Templates, type traits, SFINAE và if constexpr

## 1. Vấn đề nó giải quyết

Mã generic cần thích nghi với nhiều kiểu nhưng vẫn phải loại những phép toán không có ý nghĩa với một kiểu cụ thể. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Hàm, template và các kiểu cơ bản.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Template là bản thiết kế, type trait là dữ kiện lúc biên dịch, SFINAE loại ứng viên không hợp lệ, còn `if constexpr` bỏ hẳn nhánh không được chọn. Hãy đọc `if constexpr` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
if constexpr (std::is_integral_v<T>) { /* integral path */ }
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `if constexpr`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Dùng `if` thường không ngăn compiler kiểm tra kiểu ở cả hai nhánh, nên phép toán sai trong nhánh không chạy vẫn có thể gây lỗi biên dịch.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi một thuật toán có cấu trúc chung thật sự nhưng cần vài lựa chọn phụ thuộc kiểu.
- Tránh dùng khi các hành vi không liên quan sẽ rõ hơn nếu tách thành hàm thường.

## 8. Ví dụ đơn giản

Ví dụ phân loại một số nguyên và một số thực tại compile time rồi in mô tả khác nhau. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `if constexpr` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `if constexpr` trong ví dụ tối thiểu là gì?
2. Trung bình — Nhánh nào của `describe(3.5)` được tạo mã, và nhánh còn lại ra sao?
3. Khó — Vì sao substitution failure chỉ loại một overload, nhưng lỗi trong thân hàm đã được chọn lại có thể làm cả chương trình biên dịch thất bại?
