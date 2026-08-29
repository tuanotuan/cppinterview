# Ngày 30 — std::byte và object representation

## 1. Vấn đề nó giải quyết

Raw memory thường được biểu diễn bằng character integer vô tình cho phép arithmetic. `std::byte` biểu diễn byte của object representation và hỗ trợ bit operation mà không giả là number.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết object representation, unsigned integer, bitwise operation, array và `std::memcpy`.

## 3. Ý tưởng cốt lõi

`std::byte` là type dạng enum cho raw bit. Dùng `std::to_integer` khi chủ động diễn giải thành số và `std::memcpy` để copy representation của trivially copyable object không vi phạm aliasing.

## 4. Cú pháp tối thiểu

```cpp
std::array<std::byte, sizeof(value)> bytes{};
std::memcpy(bytes.data(), &value, sizeof value);
auto bits = std::to_integer<unsigned>(bytes[0]);
```

## 5. Cách nó hoạt động

1. Representation của integer được copy vào byte array rồi copy ngược sang integer khác.
2. Byte mask riêng thể hiện bitwise operation và explicit conversion mà không phụ thuộc host endianness.
3. Chương trình in hexadecimal round trip `12345678` và `low nibble: 11`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Byte copy từ object là representation, không tự động thành serialization portable; padding, endianness và type invariant vẫn tồn tại.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi code thao tác buffer, serialization staging, hashing input hoặc inspect object representation bằng rule rõ.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Round trip an toàn cho fixed-width integer, còn mask hiển thị được dựng độc lập nên output xác định trên mọi endian order.

## 9. Điều cần nhớ

- Dùng byte cho representation, integer cho arithmetic và format có tài liệu cho interchange.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::byte và object representation giải quyết vấn đề chính nào?
2. Trung bình — Vì sao round trip giữ value trên cả little-endian lẫn big-endian host?
3. Khó — Vì sao copy arbitrary byte vào non-trivial object có thể vi phạm lifetime hoặc invariant?
