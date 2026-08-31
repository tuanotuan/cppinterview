# Ngày 10 — Simpler implicit move

## 1. Vấn đề nó giải quyết

Trả biến cục bộ hoặc tham số truyền theo giá trị thường nên chuyển tài nguyên. C++23 đơn giản hóa overload resolution bằng cách xem toán hạng return đủ điều kiện như rvalue mà không dùng mô hình thử hai bước cũ.

## 2. Kiến thức cần có

- Ngày 3: move semantics và lifetime đối tượng.
- Ngày 9: prvalue và biểu thức tạo giá trị.

## 3. Ý tưởng cốt lõi

Ở ranh giới return, biến cục bộ đủ điều kiện sắp rời hàm. Ngôn ngữ ưu tiên cách xử lý move mà không bắt viết `std::move` trong return thông thường. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::unique_ptr<int> pass(std::unique_ptr<int> p) { return p; }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Simpler implicit move.
1. Chương trình trả tham số move-only mà không viết `std::move`.
1. Cuối cùng, nó in hoặc kiểm tra bên gọi nhận cùng số nguyên được sở hữu mà không có phép sao chép để dễ đối chiếu.

## 6. Lỗi thường gặp

- Viết `return std::move(local);` có thể cản named return value optimization; cho rằng implicit move áp dụng cho global hoặc đối tượng qua tham chiếu cũng sai.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi trả giá trị cục bộ và tham số truyền theo giá trị, nhất là kiểu move-only.
- Tránh dùng khi ép move dữ liệu hàm không sở hữu hoặc thêm `std::move` vào mọi return.

## 8. Ví dụ đơn giản

Factory trả trực tiếp kết quả `std::unique_ptr`, làm việc chuyển quyền sở hữu rõ ràng và an toàn. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao biến cục bộ đủ điều kiện implicit move còn đối tượng global có tên trong cùng câu return lại không?
