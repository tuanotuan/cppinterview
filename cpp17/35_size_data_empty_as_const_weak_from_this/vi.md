# Ngày 35 — std::size, std::data, std::empty, std::as_const và weak_from_this

## 1. Vấn đề nó giải quyết

Generic code cần inspect built-in array và container thống nhất, yêu cầu const access rõ và observe shared object mà không kéo dài ownership. C++17 thêm utility nhỏ cho từng nhu cầu.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết array, container, pointer range, const overload, `shared_ptr`, `weak_ptr` và `enable_shared_from_this`.

## 3. Ý tưởng cốt lõi

`std::size`, `std::data` và `std::empty` cho truy cập thống nhất. `std::as_const` chọn const view không copy, còn `weak_from_this` lấy observer non-owning gắn với shared control block hiện có.

## 4. Cú pháp tối thiểu

```cpp
std::size(array);
std::data(container);
std::empty(container);
std::as_const(value);
weak_from_this();
```

## 5. Cách nó hoạt động

1. Array utility báo bound và first data, còn `as_const` cung cấp const reference.
2. Heap-owned node gọi `weak_from_this` chỉ sau khi `shared_ptr` thiết lập control block.
3. Chương trình in size/data state của array cùng weak observer chưa expired, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- `weak_from_this` trên object chưa được shared control block quản lý trả observer rỗng; nó không tạo shared ownership.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi generic utility hoặc callback graph cần constness rõ và non-owning observation.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Fixed array không bị copy, còn weak observer của node được kiểm tra khi shared owner vẫn sống.

## 9. Điều cần nhớ

- Standard utility nhỏ loại bỏ ad hoc overload, còn weak observation phải phụ thuộc owning lifetime rõ.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::size, std::data, std::empty, std::as_const và weak_from_this giải quyết vấn đề chính nào?
2. Trung bình — `std::as_const(values)` có tạo array khác không?
3. Khó — Vì sao gọi `shared_from_this` trên object chưa có owner nguy hiểm hơn `weak_from_this`?
