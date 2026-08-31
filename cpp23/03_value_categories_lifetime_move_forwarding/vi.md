# Ngày 3 — Value category, lifetime, move và perfect forwarding

## 1. Vấn đề nó giải quyết

Mã generic hiện đại phải giữ được việc đối số là đối tượng có tên hay giá trị tạm. Move có thể chuyển tài nguyên, còn perfect forwarding giữ value category của lời gọi.

## 2. Kiến thức cần có

- Ngày 1–2: chế độ biên dịch và đọc chẩn đoán compiler.
- Tham chiếu, hàm và template cơ bản đã học trước lộ trình này.

## 3. Ý tưởng cốt lõi

Lvalue là đối tượng có danh tính; rvalue thường là giá trị có thể dùng rồi bỏ. `std::move` cho phép chuyển, còn `std::forward` giữ đúng category ban đầu theo điều kiện. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
template<class T>
void relay(T&& x) { use(std::forward<T>(x)); }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Value category, lifetime, move và perfect forwarding.
1. Chương trình chuyển tiếp một chuỗi có tên dưới dạng lvalue và một chuỗi tạm dưới dạng rvalue.
1. Cuối cùng, nó in hoặc kiểm tra hai nhãn overload khác nhau chứng minh category đã được giữ để dễ đối chiếu.

## 6. Lỗi thường gặp

- Hiểu `std::move` là thao tác luôn di chuyển là sai; nó là phép ép kiểu, còn overload được chọn mới thực hiện chuyển tài nguyên.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi chuyển quyền sở hữu và wrapper chuyển tiếp cần giữ ý định của bên gọi.
- Tránh dùng khi move từ đối tượng vẫn phải giữ giá trị cũ hoặc trả tham chiếu đến giá trị tạm đã hết đời.

## 8. Ví dụ đơn giản

Wrapper ghi log chuyển tiếp thông điệp đến overload dành cho chuỗi tái sử dụng và chuỗi tạm mà không sao chép thừa. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Bên trong `relay(T&& x)`, vì sao biểu thức `x` là lvalue dù bên gọi truyền rvalue, và `std::forward<T>(x)` sửa điều đó thế nào?
