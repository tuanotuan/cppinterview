# Ngày 29 — `std::forward_like`

## 1. Vấn đề nó giải quyết

Accessor generic thường cần forward một member giống một kiểu khác chứ không giống kiểu suy luận riêng của member. `std::forward_like<T>` chép mẫu cv/ref của `T` lên biểu thức khác.

## 2. Kiến thức cần có

- Ngày 3: `std::forward` và value category.
- Ngày 12: chiếu thuộc tính cv/ref từ đối tượng.

## 3. Ý tưởng cốt lõi

Hãy xem `T` là con dấu chứa mực `const` và lvalue/rvalue. `forward_like<T>(x)` đóng các thuộc tính đó lên `x` mà tự nó không chuyển dữ liệu. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
return std::forward_like<Self>(object.member);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::forward_like`.
1. Chương trình chiếu category lvalue hoặc rvalue của owner lên member số nguyên và kiểm tra kiểu kết quả.
1. Cuối cùng, nó in hoặc kiểm tra chứng minh compile-time cho phép chiếu tham chiếu lvalue và rvalue để dễ đối chiếu.

## 6. Lỗi thường gặp

- Dùng `std::forward<decltype(member)>` forward theo khai báo member chứ không theo owner; giữ tham chiếu rvalue được chiếu lâu hơn owner có thể bị treo.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi accessor, tiện ích tuple-like và proxy object phải phản chiếu cv/ref của đối tượng khác.
- Tránh dùng khi forwarding thông thường khi `std::forward<T>(x)` đã có đúng kiểu nguồn mong muốn.

## 8. Ví dụ đơn giản

Wrapper đưa payload ra dạng mutable, const, movable hoặc không movable tùy cách chính wrapper được dùng. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Với `T = const Widget&`, `std::forward_like<T>(x)` thêm qualifier cv/ref nào, và qualifier nào từ `x` không được sao chép mù quáng?
