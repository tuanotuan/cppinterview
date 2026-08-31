# Ngày 26 — `std::expected` và `std::unexpected`

## 1. Vấn đề nó giải quyết

Thao tác có thể thất bại vì lý do bên gọi cần xem. `std::expected<T, E>` lưu hoặc giá trị thành công `T` hoặc lỗi `E`; `std::unexpected` tạo nhánh lỗi.

## 2. Kiến thức cần có

- Ngày 25: pipeline thành công của optional.
- Variant, giá trị trả về và xử lý lỗi.

## 3. Ý tưởng cốt lõi

Đây là kết quả hai đường ray. Khác exception, đường ray lỗi xuất hiện trong kiểu hàm và phải kiểm tra trước khi lấy giá trị thành công. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::expected<int, Error> result = value;
return std::unexpected(error);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::expected` và `std::unexpected`.
1. Chương trình trả số nguyên cố định hoặc lỗi chuỗi mô tả từ parser nhỏ.
1. Cuối cùng, nó in hoặc kiểm tra giá trị thành công cho input hợp lệ cố định để dễ đối chiếu.

## 6. Lỗi thường gặp

- Gọi `value()` chưa kiểm tra có thể ném `std::bad_expected_access`; chọn kiểu lỗi lớn hoặc không liên quan làm mọi kết quả nặng và khó dùng.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi lỗi dự kiến, thường gặp như parse, validation và trạng thái I/O có thể phục hồi.
- Tránh dùng khi bug lập trình hoặc thất bại thật sự ngoại lệ mà phục hồi cục bộ không có ý nghĩa.

## 8. Ví dụ đơn giản

Parser port trả số cổng hoặc thông báo như `out of range` mà không ném exception. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu `T` và `E` cùng kiểu, constructor phân biệt thành công với lỗi thế nào, và vì sao `std::unexpected` là cần thiết?
