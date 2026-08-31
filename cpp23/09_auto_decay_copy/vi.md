# Ngày 9 — Decay-copy với `auto(x)` và `auto{x}`

## 1. Vấn đề nó giải quyết

Mã generic thường cần một bản sao giá trị thường, bỏ tham chiếu và `const` cấp ngoài. C++23 cho phép `auto` xuất hiện như biểu thức ép kiểu để decay-copy rõ ràng.

## 2. Kiến thức cần có

- Ngày 3: tham chiếu, value category và suy luận kiểu.
- Ngày 8: đọc biểu thức trong các ngữ cảnh đánh giá khác nhau.

## 3. Ý tưởng cốt lõi

Hãy xem `auto(x)` là đưa `x` qua bộ lọc suy luận giống biến `auto`, rồi tạo một prvalue mới độc lập. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto copy = auto(source);
auto copy2 = auto{source};
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Decay-copy với `auto(x)` và `auto{x}`.
1. Chương trình sao chép một `const int&` bằng cả hai cách viết rồi kiểm tra kiểu suy luận.
1. Cuối cùng, nó in hoặc kiểm tra hai giá trị `int` độc lập, thay đổi chúng không sửa nguồn để dễ đối chiếu.

## 6. Lỗi thường gặp

- Mong `auto{x}` giữ tham chiếu hoặc vô tình dùng nó để sao chép đối tượng đắt tiền sẽ gây bất ngờ logic hay hiệu năng.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi biểu thức generic cố ý cần giá trị đã decay thay vì một bí danh tham chiếu.
- Tránh dùng khi đối tượng lớn khi ý định là giữ tham chiếu hoặc chuyển quyền sở hữu.

## 8. Ví dụ đơn giản

Wrapper chụp lại một giá trị cấu hình để cập nhật sau đó trên tham chiếu gốc không ảnh hưởng thao tác hiện tại. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Với `const int& r`, `decltype(auto(r))` là gì và biểu thức `auto(r)` có value category nào?
