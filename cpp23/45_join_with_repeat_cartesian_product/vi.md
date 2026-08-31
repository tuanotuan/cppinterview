# Ngày 45 — View join-with, repeat và cartesian-product

## 1. Vấn đề nó giải quyết

C++23 có thể làm phẳng range lồng với dấu phân cách, sinh giá trị lặp một cách lười và liệt kê mọi tổ hợp của nhiều range mà không dựng trước toàn bộ kết quả.

## 2. Kiến thức cần có

- Ngày 44: view gom nhóm và lấy mẫu.
- Tuple và range lồng.

## 3. Ý tưởng cốt lõi

`join_with` nối các mảnh bằng delimiter, `repeat` là nguồn theo nhu cầu, còn `cartesian_product` giống các vòng lặp lồng được đóng thành một range lười. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto pairs = std::views::cartesian_product(left, right);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho View join-with, repeat và cartesian-product.
1. Chương trình nối từ, lặp một giá trị cố định và tạo mọi cặp khi adaptor tồn tại.
1. Cuối cùng, nó in hoặc kiểm tra dãy có delimiter, giá trị lặp và tích Descartes nhỏ đầy đủ để dễ đối chiếu.

## 6. Lỗi thường gặp

- Repeat vô hạn hoặc Cartesian product lớn có thể làm duyệt gần như vô tận hoặc bùng nổ chi phí; kiểu phần tử nối và delimiter phải tương thích.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi tìm kiếm tổ hợp nhỏ, hằng lười và nối dễ đọc các range ký tự lồng.
- Tránh dùng khi materialize tích rất lớn hoặc dùng nguồn lười vô hạn mà không có adaptor dừng.

## 8. Ví dụ đơn giản

Bộ sinh test kết hợp lười hai mã thao tác với ba kích thước payload để tạo sáu trường hợp. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu kích thước input là `a`, `b`, `c`, size Cartesian product là bao nhiêu và input rỗng nào làm toàn bộ tích rỗng?
