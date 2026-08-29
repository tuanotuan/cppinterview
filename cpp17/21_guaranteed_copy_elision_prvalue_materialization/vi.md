# Ngày 21 — Guaranteed copy elision và prvalue materialization

## 1. Vấn đề nó giải quyết

Return object mới theo value từng có vẻ phụ thuộc optional optimization và move constructor truy cập được. C++17 định nghĩa lại các trường hợp prvalue quan trọng để destination object được khởi tạo trực tiếp.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết constructor, copy/move operation, return-by-value, temporary và value category.

## 3. Ý tưởng cốt lõi

Prvalue ban đầu biểu diễn initialization thay vì một temporary object riêng. Trong trường hợp bảo đảm như return `Token{42}` thành `Token`, result object được dựng trực tiếp; materialization chỉ xảy ra khi cần object thật.

## 4. Cú pháp tối thiểu

```cpp
Token make_token() {
    return Token{42};
}
Token token = make_token();
```

## 5. Cách nó hoạt động

1. Factory return prvalue đúng class type đã khai báo.
2. C++17 khởi tạo function result rồi local destination mà không gọi copy hay move constructor đã delete.
3. Chương trình in `construct 42` đúng một lần, rồi `value: 42`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Named return value optimization vẫn khác: return named local có thể cần move hoặc copy truy cập được nếu optional NRVO không xảy ra.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi factory tự nhiên tạo rồi return fresh value đúng result type đã khai báo.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Cả copy lẫn move constructor đều delete nhưng program vẫn hợp lệ vì không có source object cần chuyển trong prvalue path được bảo đảm.

## 9. Điều cần nhớ

- Hãy return value tự nhiên; không thêm `std::move` vào fresh prvalue và phải phân biệt guaranteed elision với optional NRVO.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Guaranteed copy elision và prvalue materialization giải quyết vấn đề chính nào?
2. Trung bình — Có bao nhiêu constructor message, và vì sao move đã delete không liên quan?
3. Khó — Vì sao return named local có requirement khác return `Token{42}`?
