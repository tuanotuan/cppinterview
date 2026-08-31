# Ngày 27 — Monadic operation và error pipeline với `std::expected`

## 1. Vấn đề nó giải quyết

Nhiều bước có thể lỗi thường cần kiểm tra lặp và return sớm. Monadic operation C++23 nối chúng, giữ lỗi đầu tiên và bỏ các bước thành công phía sau.

## 2. Kiến thức cần có

- Ngày 25: từ vựng monadic của `optional`.
- Ngày 26: nhánh thành công và lỗi trong `expected`.

## 3. Ý tưởng cốt lõi

Hãy hình dung bộ chuyển đường ray. `and_then` đi tiếp trên ray thành công, `transform` đổi giá trị mang theo, còn `or_else` xem hoặc thay ray lỗi. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
read().and_then(parse).transform(normalize).or_else(report);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Monadic operation và error pipeline với `std::expected`.
1. Chương trình nối hai bước số nguyên có thể lỗi khi thư viện hỗ trợ monadic `expected`.
1. Cuối cùng, nó in hoặc kiểm tra giá trị biến đổi cuối hoặc thông báo hỗ trợ thư viện trung thực để dễ đối chiếu.

## 6. Lỗi thường gặp

- Kiểu lỗi không khớp làm pipeline không ghép được, và dùng `transform` cho hàm đã trả `expected` tạo `expected` lồng không mong muốn.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi pipeline validation hoặc chuyển đổi tuyến tính có mô hình lỗi thống nhất.
- Tránh dùng khi logic nghiệp vụ có phục hồi phân nhánh, rõ hơn khi viết câu lệnh tường minh.

## 8. Ví dụ đơn giản

Pipeline yêu cầu decode số, kiểm tra rồi đổi thành chuỗi hiển thị trong khi giữ thông báo lỗi đầu tiên. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `transform(f)` tạo `expected<expected<U, E>, E>` khi `f` trả `expected<U, E>`, và thao tác nào tránh mức lồng đó?
