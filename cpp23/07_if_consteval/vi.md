# Ngày 7 — `if consteval` và `if !consteval`

## 1. Vấn đề nó giải quyết

Một hàm `constexpr` đôi khi cần mã khác nhau giữa lúc tính hằng và lúc chạy. C++23 cung cấp cách kiểm tra trực tiếp, dễ đọc cho ngữ cảnh đánh giá đó.

## 2. Kiến thức cần có

- Ngày 6: thực thi runtime và trạng thái coroutine được lưu.
- Đã biết hàm `constexpr` và `if` thông thường.

## 3. Ý tưởng cốt lõi

Compiler có hai phòng: compile time và runtime. `if consteval` hỏi lời gọi đang được đánh giá ở phòng nào, không hỏi hàm có khai báo `constexpr` hay không. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
if consteval { return compile_path; } else { return runtime_path; }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `if consteval` và `if !consteval`.
1. Chương trình gọi cùng một hàm một lần trong constant expression và một lần ở runtime.
1. Cuối cùng, nó in hoặc kiểm tra hai giá trị cố ý khác nhau để lộ nhánh đã được chọn để dễ đối chiếu.

## 6. Lỗi thường gặp

- Thay bằng `std::is_constant_evaluated()` trong `if` thường có thể làm lời gọi immediate function không hợp lệ ở trường hợp `if consteval` xử lý được.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi API chung cần một triển khai hợp lệ lúc biên dịch và một triển khai runtime hiệu quả khác.
- Tránh dùng khi dùng nó để đoán một đối số có biết trước lúc biên dịch hay không ngoài constant evaluation.

## 8. Ví dụ đơn giản

Hàm checksum dùng nhánh đơn giản lúc biên dịch và nhánh tối ưu theo nền tảng lúc chạy dưới cùng giao diện. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Trong hàm `constexpr` được gọi bằng literal nhưng gán cho biến không `constexpr`, nhánh nào được chọn và vì sao?
