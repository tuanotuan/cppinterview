# Ngày 53 — Module thư viện chuẩn `std` và `std.compat`

## 1. Vấn đề nó giải quyết

C++23 chuẩn hóa named module cho thư viện chuẩn. `import std;` cung cấp tên thư viện C++, còn `std.compat` thêm tên tương thích thường gắn với C header.

## 2. Kiến thức cần có

- Ngày 1: hỗ trợ theo compiler và toolchain.
- Ngày 2: cấu hình build system và ma trận tính năng.

## 3. Ý tưởng cốt lõi

Header là văn bản được chèn vào từng translation unit; module là interface đã biên dịch được import theo tên. Cú pháp nguồn nhỏ nhưng cách build module vẫn phụ thuộc toolchain. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
import std;
import std.compat;
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Module thư viện chuẩn `std` và `std.compat`.
1. Chương trình đặt import thật sau build switch tường minh và chạy fallback bằng header trên GCC 13.
1. Cuối cùng, nó in hoặc kiểm tra kết quả thư viện chuẩn cố định cùng ghi nhận trung thực rằng chưa bật thiết lập module để dễ đối chiếu.

## 6. Lỗi thường gặp

- Xem module như header văn bản hoặc compile import trước khi implementation build standard module sẽ gây lỗi thiếu module; `std.compat` không nên là lý do dùng mới các tên C global.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi toolchain được hỗ trợ nơi thử nghiệm build-time cho lợi ích rõ và artifact module được cấu hình lặp lại được.
- Tránh dùng khi dự án portable có tập compiler bắt buộc chưa build cùng module thư viện chuẩn.

## 8. Ví dụ đơn giản

Build được kiểm soát import `std` thay nhiều header chuẩn và vẫn giữ đường header cho tác vụ CI chưa hỗ trợ. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `import std;` có thể là source C++23 hợp lệ nhưng vẫn lỗi trong lệnh compiler C++23 đúng nếu chưa chuẩn bị artifact module của implementation?
