# Ngày 4 — Templates, concepts, CRTP và generic programming

## 1. Vấn đề nó giải quyết

Template cho một thuật toán làm việc với nhiều kiểu. Concept nêu các phép toán bắt buộc, còn CRTP tạo tùy biến lúc biên dịch qua kiểu dẫn xuất mà không cần virtual dispatch.

## 2. Kiến thức cần có

- Ngày 3: tham chiếu, value category và forwarding.
- Class cơ bản và nạp chồng hàm đã học trước đó.

## 3. Ý tưởng cốt lõi

Template là công thức, concept là danh sách nguyên liệu, còn CRTP cho công thức biết kiểu dẫn xuất cụ thể ngay lúc biên dịch. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
template<class T>
requires Addable<T>
T add(T a, T b);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Templates, concepts, CRTP và generic programming.
1. Chương trình kiểm tra hàm cộng có ràng buộc và một thao tác in nhỏ do CRTP cung cấp.
1. Cuối cùng, nó in hoặc kiểm tra một tổng số học rồi đến giá trị do kiểu dẫn xuất cung cấp để dễ đối chiếu.

## 6. Lỗi thường gặp

- Template không ràng buộc có thể lỗi sâu trong thân hàm; concept quá rộng có thể nhận kiểu có phép toán sai ý nghĩa.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi thuật toán generic nhỏ không thêm chi phí và mixin tĩnh có yêu cầu rõ ràng.
- Tránh dùng khi CRTP khi composition thông thường hoặc hàm tự do có concept đơn giản hơn.

## 8. Ví dụ đơn giản

Tiện ích số học nhận mọi kiểu hỗ trợ phép cộng có ý nghĩa và loại kiểu không liên quan ngay tại chỗ gọi. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Nếu concept chỉ kiểm tra `a + b` hợp lệ về cú pháp, hiểu nhầm ngữ nghĩa nào vẫn có thể lọt qua ràng buộc?
