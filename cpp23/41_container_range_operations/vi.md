# Ngày 41 — Các thao tác range của container

## 1. Vấn đề nó giải quyết

Container C++23 có thể nhận trực tiếp range qua `assign_range`, `insert_range`, `append_range` và `prepend_range`. Cách này tránh viết cặp iterator và giảm lỗi endpoint.

## 2. Kiến thức cần có

- Ngày 40: chuyển range thành container.
- Sequence container và chèn bằng iterator.

## 3. Ý tưởng cốt lõi

Truyền dãy như một đối tượng thay vì hai tọa độ. Tên thao tác nói range đi vào đâu: thay toàn bộ, chèn, nối cuối hay nối đầu. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
container.assign_range(source);
container.append_range(more);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Các thao tác range của container.
1. Chương trình áp dụng bốn cập nhật theo range lên sequence container nhỏ khi được hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra thứ tự cuối sau khi thay và chèn ở hai đầu để dễ đối chiếu.

## 6. Lỗi thường gặp

- Truyền range xuất phát từ chính container có thể làm iterator của nó mất hiệu lực hoặc vi phạm yêu cầu overlap; chèn còn có thể reallocate.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi thêm toàn bộ phần tử của range tương thích với vị trí được diễn đạt rõ.
- Tránh dùng khi range tự tham chiếu hoặc trường hợp chỉ cần vài phần tử biến đổi riêng.

## 8. Ví dụ đơn giản

Buffer thông điệp prepend range header và append range checksum mà không tự quản lý endpoint iterator. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `vector.append_range(vector | views::take(2))` có thể không an toàn hoặc không được hỗ trợ dù phần tử nguồn đến từ chính vector?
