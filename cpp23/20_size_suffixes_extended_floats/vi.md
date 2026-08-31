# Ngày 20 — Literal suffix `z`/`uz` và extended floating-point type

## 1. Vấn đề nó giải quyết

Số học chỉ số thường trộn số nguyên có dấu với `std::size_t`, còn mã số học đôi khi cần độ rộng trao đổi cụ thể. C++23 thêm suffix liên quan size và các typedef floating mở rộng tùy chọn.

## 2. Kiến thức cần có

- Ngày 1: mức hỗ trợ triển khai và tính portable.
- Ngày 9: suy luận kiểu bằng `auto`.

## 3. Ý tưởng cốt lõi

`uz` tạo `std::size_t`; `z` tạo kiểu có dấu tương ứng. `<stdfloat>` đặt tên format floating độ rộng cố định được hỗ trợ, nhưng implementation không bắt buộc có mọi format. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto count = 10uz;
auto offset = -1z;
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Literal suffix `z`/`uz` và extended floating-point type.
1. Chương trình kiểm tra kiểu literal và báo có điều kiện một floating type độ rộng cố định.
1. Cuối cùng, nó in hoặc kiểm tra thông tin kích thước và kết quả khả dụng rõ ràng để dễ đối chiếu.

## 6. Lỗi thường gặp

- Dùng `-1uz` gây wrap trong kiểu unsigned; cho rằng `std::float32_t` luôn tồn tại làm mã portable bị lỗi biên dịch.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi kích thước container, hiệu chỉ số và giao thức thật sự yêu cầu floating format được hỗ trợ.
- Tránh dùng khi thêm suffix mà không kiểm tra dấu hoặc chọn extended float chỉ vì tên trông chính xác.

## 8. Ví dụ đơn giản

Chỉ số lùi dùng `-1z` để giữ kiểu có dấu liên quan size thay vì wrap thành unsigned. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — So sánh kiểu và giá trị suy luận của `-1z`, `-1uz` và `auto n = 1uz - 2uz`; phép nào bị wrap?
