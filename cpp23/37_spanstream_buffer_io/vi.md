# Ngày 37 — `std::spanstream` và I/O dựa trên buffer

## 1. Vấn đề nó giải quyết

String stream sở hữu chuỗi được quản lý động. Span stream C++23 cung cấp thao tác chèn và rút trích quen thuộc trên buffer ký tự liên tục do bên gọi cấp.

## 2. Kiến thức cần có

- Ngày 5: range liên tục và view.
- Ngày 35: output văn bản có format.

## 3. Ý tưởng cốt lõi

Stream là bộ đọc hoặc ghi tạm đặt lên một cửa sổ bộ nhớ. Owner quản lý storage; stream quản lý con trỏ format bên trong cửa sổ đó. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::ospanstream out(buffer);
std::ispanstream in(out.span());
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::spanstream` và I/O dựa trên buffer.
1. Chương trình ghi hai số nguyên vào buffer cố định rồi parse lại qua span đã ghi.
1. Cuối cùng, nó in hoặc kiểm tra hai số nguyên gốc được lấy lại mà không cần buffer stringstream sở hữu để dễ đối chiếu.

## 6. Lỗi thường gặp

- Ghi vượt capacity làm stream vào trạng thái lỗi; xem toàn bộ buffer gốc là output hợp lệ thay vì `span()` sẽ gồm byte chưa ghi.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi giao thức văn bản có giới hạn, buffer nhúng và parse format nhạy với cấp phát.
- Tránh dùng khi output không giới hạn, chưa biết kích thước và dễ sở hữu bằng `std::string` hơn.

## 8. Ví dụ đơn giản

Thông điệp thiết bị nhỏ format hai số đo vào buffer stack 32 byte rồi parse ngay để kiểm thử. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Sau khi output spanstream ghi ít byte hơn capacity, vì sao input span phải tạo từ `out.span()` thay vì toàn bộ buffer gốc?
