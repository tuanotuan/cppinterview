# Ngày 48 — Fold algorithm, `ranges::iota` và shift algorithm

## 1. Vấn đề nó giải quyết

C++23 thêm fold trái, fold phải có tên và iota theo range, bổ sung cho shift algorithm hiện có để dời phần tử trong dãy. Hướng và boundary trả về trở nên rõ.

## 2. Kiến thức cần có

- Ngày 5: thuật toán trên range.
- Ngày 47: thuật toán constrained C++23.

## 3. Ý tưởng cốt lõi

Fold nén dãy thành một giá trị theo hướng chọn. `ranges::iota` ghi giá trị tăng dần; shift dời phần tử còn lại và trả boundary logic mới. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto sum = std::ranges::fold_left(values, 0, std::plus{});
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Fold algorithm, `ranges::iota` và shift algorithm.
1. Chương trình điền, fold và shift một range số nguyên nhỏ khi các thuật toán C++23 có mặt.
1. Cuối cùng, nó in hoặc kiểm tra tổng và dãy đến logical end được trả về để dễ đối chiếu.

## 6. Lỗi thường gặp

- Fold trái và phải khác nhau với phép toán không kết hợp; phần tử sau boundary shift vẫn hợp lệ nhưng có giá trị không xác định.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi phép rút gọn có hướng chủ ý, điền tuần tự và shift tại chỗ kiểu loại phần tử.
- Tránh dùng khi giả định reduction song song cho phép toán không kết hợp hoặc mã đọc phần đuôi không xác định sau shift.

## 8. Ví dụ đơn giản

Buffer đánh số slot, fold kích thước hoạt động thành tổng rồi shift phần tử còn lại sang trái sau khi tiêu thụ một mục. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Với phép trừ, so sánh fold trái và fold phải trên `1, 2, 3`; vì sao tính kết hợp quyết định có được bỏ qua hướng hay không?
