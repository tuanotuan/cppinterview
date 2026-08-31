# Ngày 12 — Deducing `this` với `const` và value category

## 1. Vấn đề nó giải quyết

Accessor thường cần bốn dạng: mutable lvalue, const lvalue, mutable rvalue và const rvalue. Explicit object parameter được suy luận có thể giữ cả bốn trong một thân hàm.

## 2. Kiến thức cần có

- Ngày 3: forwarding reference và `std::forward`.
- Ngày 11: cú pháp explicit object parameter.

## 3. Ý tưởng cốt lõi

Đối tượng đi vào qua `Self&&`. Forward `self` giống như phản chiếu thuộc tính `const` và lvalue/rvalue của bên gọi lên member được trả về. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
template<class Self>
decltype(auto) get(this Self&& self);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Deducing `this` với `const` và value category.
1. Chương trình kiểm tra kiểu tham chiếu trả về từ đối tượng mutable, const và đã move.
1. Cuối cùng, nó in hoặc kiểm tra các type assertion lúc biên dịch chứng minh thông tin cv/ref được giữ để dễ đối chiếu.

## 6. Lỗi thường gặp

- Trả `(self.value)` mà không forward có thể biến truy cập rvalue thành tham chiếu lvalue; trả tham chiếu từ temporary cũng có thể treo sau full expression.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi accessor và adapter phải phản chiếu category của đối tượng bên gọi.
- Tránh dùng khi trả tham chiếu từ đối tượng rvalue khi bên gọi có thể giữ nó lâu hơn lifetime đối tượng.

## 8. Ví dụ đơn giản

Wrapper trả `T&` cho mutable lvalue, `const T&` cho const lvalue và `T&&` cho temporary. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Với `const Box&&`, `Self` được suy luận thành gì và member được forward đúng phải tạo kiểu tham chiếu nào?
