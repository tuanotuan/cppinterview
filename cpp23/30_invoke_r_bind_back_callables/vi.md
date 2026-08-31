# Ngày 30 — `std::invoke_r`, `std::bind_back` và callable utility

## 1. Vấn đề nó giải quyết

Mã callable phải xử lý thống nhất hàm tự do, member pointer và function object. `std::invoke_r` còn yêu cầu kiểu kết quả, còn `std::bind_back` lưu đối số ở cuối lời gọi tương lai.

## 2. Kiến thức cần có

- Ngày 28: callable type-erased.
- Ngày 29: forwarding và category của đối số.

## 3. Ý tưởng cốt lõi

`std::invoke` là nút gọi chung. Dạng `_r` bọc thêm bộ đổi kiểu kết quả; `bind_back` tạo nút mới có các ô đối số cuối đã điền. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
long n = std::invoke_r<long>(callable, 2, 3);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::invoke_r`, `std::bind_back` và callable utility.
1. Chương trình gọi phép cộng với kiểu kết quả tường minh và bind có điều kiện một đối số cuối.
1. Cuối cùng, nó in hoặc kiểm tra tổng đã chuyển kiểu và, khi có hỗ trợ, kết quả của callable đã bind để dễ đối chiếu.

## 6. Lỗi thường gặp

- Kiểu `R` không chuyển ngầm được từ kết quả thật làm `invoke_r` không hợp lệ; lưu tham chiếu trong bound object có thể sống lâu hơn đối tượng được tham chiếu.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi lớp dispatch generic và partial application nhỏ có quyền sở hữu giá trị bind rõ ràng.
- Tránh dùng khi sắp xếp đối số phức tạp mà lambda có tên tham số dễ đọc hơn.

## 8. Ví dụ đơn giản

Factory bộ lọc bind giới hạn trên cố định ở cuối và để giá trị đo làm đối số tương lai. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu callable trả `double`, khi nào `std::invoke_r<int>` hợp lệ, và điều này khác gì với yêu cầu chính callable khai báo trả `int`?
