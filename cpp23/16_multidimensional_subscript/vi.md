# Ngày 16 — Multidimensional subscript operator

## 1. Vấn đề nó giải quyết

Trước C++23, matrix tự tạo thường dùng bracket nối chuỗi hoặc `operator()`. C++23 cho phép subscript operator nạp chồng nhận nhiều chỉ số trực tiếp như `grid[row, column]`.

## 2. Kiến thức cần có

- Ngày 15: static `operator[]` và nạp chồng operator.
- Mảng và cách đánh chỉ số theo hàng.

## 3. Ý tưởng cốt lõi

Cặp bracket trở thành một lời gọi hàm có nhiều đối số. Class ánh xạ tọa độ logic sang layout vật lý mà nó chọn. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
int& operator[](std::size_t row, std::size_t column);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Multidimensional subscript operator.
1. Chương trình ghi và đọc một phần tử qua subscript hai chỉ số.
1. Cuối cùng, nó in hoặc kiểm tra giá trị tại hàng và cột được chọn để dễ đối chiếu.

## 6. Lỗi thường gặp

- Bỏ kiểm tra biên có thể gây undefined behavior; nhầm cú pháp này với comma operator dựng sẵn trên compiler cũ sẽ đổi ý nghĩa.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi abstraction matrix, ảnh, tensor hoặc bảng nơi ký hiệu tọa độ dễ đọc hơn.
- Tránh dùng khi buffer phẳng thô khi chỉ số tính trực tiếp rõ hơn và không cần abstraction.

## 8. Ví dụ đơn giản

Ảnh nhỏ lưu sáu pixel theo row-major và truy cập pixel góc dưới phải bằng `image[1, 2]`. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `a[i, j]` gọi một overload hai tham số trong C++23 nhưng có thể đánh giá comma expression với kiểu không có overload đó?
