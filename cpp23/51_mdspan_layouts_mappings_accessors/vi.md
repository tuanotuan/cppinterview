# Ngày 51 — Layout, mapping và accessor của `mdspan`

## 1. Vấn đề nó giải quyết

Cùng tọa độ logic có thể ánh xạ vào bộ nhớ theo thứ tự khác, và truy cập phần tử có thể cần policy tùy biến. `mdspan` tách extents, layout mapping và accessor để tùy biến không thêm chi phí.

## 2. Kiến thức cần có

- Ngày 50: ownership và extents của mdspan.
- Ngày 4: kiểu generic dựa trên policy.

## 3. Ý tưởng cốt lõi

Extents định nghĩa lưới, layout mapping đổi tọa độ thành offset, còn accessor biến handle cộng offset thành tham chiếu hoặc giá trị được lộ ra. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::mdspan<T, Extents, std::layout_left, Accessor> view(data);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Layout, mapping và accessor của `mdspan`.
1. Chương trình so sánh offset layout và dùng read accessor nhỏ khi mdspan được triển khai.
1. Cuối cùng, nó in hoặc kiểm tra offset khác nhau cho cùng tọa độ và giá trị đã qua accessor để dễ đối chiếu.

## 6. Lỗi thường gặp

- Dùng layout không khớp storage bên ngoài sẽ âm thầm đọc sai phần tử; custom accessor trả proxy treo hoặc vi phạm hợp đồng offset làm hỏng view.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi tương tác với bộ nhớ row-major, column-major, strided, device hoặc truy cập đặc biệt.
- Tránh dùng khi tạo policy tùy biến khi `layout_right` và `default_accessor` đã khớp storage.

## 8. Ví dụ đơn giản

Mảng khoa học column-major dùng `layout_left`, còn checking accessor đưa giá trị ra qua policy đọc có kiểm soát. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Với matrix `2 × 3`, `layout_left` và `layout_right` ánh xạ tọa độ `(1, 0)` thế nào, và mỗi layout ngụ ý thứ tự storage nào?
