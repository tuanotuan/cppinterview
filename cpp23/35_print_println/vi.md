# Ngày 35 — `std::print` và `std::println`

## 1. Vấn đề nó giải quyết

Toán tử chèn stream có thể dài dòng và tách format khỏi giá trị. `std::print` C++23 ghi văn bản đã format trực tiếp, còn `std::println` thêm newline cuối.

## 2. Kiến thức cần có

- Ngày 1: mức khả dụng của tính năng thư viện.
- Chuỗi, stream và trường format cơ bản.

## 3. Ý tưởng cốt lõi

Format string là khuôn có các lỗ theo thứ tự. Đối số lấp lỗ theo quy tắc format biết kiểu rồi kết quả đi thẳng đến output stream được chọn. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::println("score = {}", score);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::print` và `std::println`.
1. Chương trình dùng `std::println` khi thư viện có hỗ trợ và nhánh stream tương đương khi chưa có.
1. Cuối cùng, nó in hoặc kiểm tra điểm cố định trên một dòng hoàn chỉnh để dễ đối chiếu.

## 6. Lỗi thường gặp

- Format string runtime cần facility runtime phù hợp; số field và đối số không khớp có thể bị chẩn đoán compile-time với format literal.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi output cho người dùng, log và chẩn đoán cần format có kiểu gọn.
- Tránh dùng khi output nhị phân hoặc trạng thái stream tùy biến cao đã được mã stream cũ diễn đạt rõ.

## 8. Ví dụ đơn giản

Lệnh in `đã xử lý 12 bản ghi` bằng một format string và một đối số nguyên. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao format string literal có thể loại kiểu đối số sai lúc biên dịch còn format string tạo động cần đường kiểm tra khác?
