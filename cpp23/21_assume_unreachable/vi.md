# Ngày 21 — `[[assume]]` và `std::unreachable`

## 1. Vấn đề nó giải quyết

Optimizer có thể sinh mã tốt hơn khi invariant được bảo đảm nhưng không chứng minh được. C++23 cung cấp `[[assume(expr)]]` và `std::unreachable()` để nói một số trạng thái không thể xảy ra.

## 2. Kiến thức cần có

- Ngày 1: tối ưu compiler và mức hỗ trợ triển khai.
- Điều kiện, undefined behavior và attribute.

## 3. Ý tưởng cốt lõi

Đây là lời hứa, không phải phép kiểm tra. Nếu thực thi vi phạm lời hứa, chương trình có undefined behavior và optimizer có thể xóa mã bạn tưởng sẽ bảo vệ mình. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
if (bad_state) std::unreachable();
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `[[assume]]` và `std::unreachable`.
1. Chương trình tính bình phương sau khi diễn đạt đầu vào cố định thỏa invariant.
1. Cuối cùng, nó in hoặc kiểm tra kết quả dương xác định mà không vào nhánh bất khả thi để dễ đối chiếu.

## 6. Lỗi thường gặp

- Dùng một trong hai cho input người dùng chưa kiểm tra biến lỗi thường thành undefined behavior; assertion debug không tự thay thế chứng minh ở release.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi invariant thật sự được bảo đảm tại ranh giới hiệu năng thấp tầng sau khi kiểm tra.
- Tránh dùng khi lỗi có thể phục hồi, input bên ngoài hoặc điều kiện chỉ có khả năng cao chứ không chắc chắn.

## 8. Ví dụ đơn giản

Sau switch vét cạn trạng thái giao thức, nhánh default được đánh unreachable vì kiểm tra trước bảo đảm giá trị enum. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao đặt `[[assume(x != 0)]]` trước khi kiểm tra `x` có thể làm mất hiệu lực cả mã trông như xử lý `x == 0` phía sau?
