# Ngày 35 — Type-trait aliases, SFINAE và std::enable_if

## 1. Vấn đề nó giải quyết

Thân template có thể chỉ hợp lệ với vài kiểu nhưng declaration không constraint vẫn tham gia overload resolution cho mọi kiểu. SFINAE loại candidate khi substitution thất bại, còn `std::enable_if_t` diễn đạt điều kiện tham gia Boolean gọn hơn.

## 2. Kiến thức cần có

- Ngày 5, 15 và 34: template, type trait, alias, overload resolution và substitution.

## 3. Ý tưởng cốt lõi

Substitution failure là bộ lọc chứ chưa phải lỗi chương trình trong lúc tạo candidate. `enable_if` chỉ có nested type khi điều kiện true nên candidate false biến mất.

## 4. Cú pháp tối thiểu

```cpp
template<class T>
using integral_t = std::enable_if_t<std::is_integral<T>::value, T>;

template<class T>
integral_t<T> twice(T value);
```

## 5. Cách nó hoạt động

1. Template argument deduction đề xuất một `T` cụ thể cho lời gọi.
2. Trait đánh giá `T` có integral hay không; chỉ khi đó alias mới tạo return type hợp lệ.
3. Lời gọi số nguyên biên dịch và in giá trị gấp đôi, còn lời gọi floating-point sẽ không có candidate phù hợp.

## 6. Lỗi thường gặp

- Đặt điều kiện ở nơi không thuộc quá trình substitution có thể biến SFINAE dự kiến thành lỗi biên dịch cứng.
- Trước khi áp dụng mẫu, phải kiểm tra biểu thức trait, substitution context, overload ambiguity, diagnostic và việc overload đơn giản có đủ không.

## 7. Khi nào nên dùng

- Nên dùng khi overload C++14 chỉ được tham gia cho một họ kiểu có thể kiểm tra chính xác.
- Tránh dùng khi điều kiện trở nên phức tạp hoặc wrapper có tên cùng static assertion giúp người dùng hiểu rõ hơn.

## 8. Ví dụ đơn giản

Alias `integral_result_t` chỉ tồn tại cho kiểu integral. Vì vậy `twice` nhận `int` và `long` nhưng loại `double`.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- SFINAE kiểm soát việc candidate tham gia trong substitution; nó không phải nhánh runtime.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra biểu thức trait, substitution context, overload ambiguity, diagnostic và việc overload đơn giản có đủ không.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Type-trait aliases, SFINAE và std::enable_if là gì?
2. Trung bình — Vì sao `twice(21)` tạo được template specialization khả dụng?
3. Khó — Điểm khác biệt nào tách substitution failure loại candidate khỏi lỗi nằm trong thân hàm đã instantiate?
