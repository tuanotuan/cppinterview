# Ngày 8 — Các mở rộng `constexpr` trong C++23

## 1. Vấn đề nó giải quyết

C++23 bỏ một số giới hạn nhân tạo trong thân hàm `constexpr`. Nhiều mã trông bình thường hơn có thể khai báo `constexpr`, nhưng chỉ đường đi hợp lệ mới được chạy lúc biên dịch.

## 2. Kiến thức cần có

- Ngày 7: ngữ cảnh constant evaluation và `if consteval`.
- Biến và hàm `constexpr` cơ bản.

## 3. Ý tưởng cốt lõi

Hàm `constexpr` là công cụ dùng được ở hai thời điểm, không phải lời hứa mọi lời gọi đều ở compile time. C++23 cho phép thêm cấu trúc nhưng bộ đánh giá vẫn kiểm tra đường đi thực tế. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
constexpr int value() { static constexpr int n = 7; return n; }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Các mở rộng `constexpr` trong C++23.
1. Chương trình dùng hằng static được C++23 cho phép trong hàm `constexpr` khi compiler hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra giá trị được chứng minh bằng `static_assert` hoặc thông báo hỗ trợ rõ ràng trên toolchain này để dễ đối chiếu.

## 6. Lỗi thường gặp

- Cho rằng mọi câu lệnh trong hàm `constexpr` đều chạy được lúc tính hằng là nhầm giữa quy tắc khai báo và quy tắc đánh giá.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi thuật toán cần chạy cả lúc biên dịch lẫn runtime bằng một thân hàm dễ đọc.
- Tránh dùng khi ép khối lượng lớn vào compile time khi chỉ làm build chậm mà không tăng độ đúng.

## 8. Ví dụ đơn giản

Phép tính kích thước bảng nhỏ được kiểm tra lúc biên dịch rồi tái sử dụng ở runtime. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao hàm `constexpr` có thể chứa cấu trúc làm một đường đi không phải constant expression nhưng đường khác vẫn thành công?
