# Ngày 50 — Fixed-width integers, binary parsing và endianness

## 1. Vấn đề nó giải quyết

Binary protocol định nghĩa field bằng bit width và byte order chính xác, trong khi kích thước số nguyên C++ native cùng host byte order có thể khác. Fixed-width integer và phép parse shift/or rõ ràng làm biểu diễn bên ngoài độc lập layout máy.

## 2. Kiến thức cần có

- Ngày 8, 24 và 49: binary literal, object representation, phép shift, unsigned arithmetic, layout và portability.

## 3. Ý tưởng cốt lõi

Byte trên wire là một format, không phải object trong memory. Đọc từng byte dạng unsigned, widen trước khi shift, kết hợp theo endian order đã khai báo và không reinterpret byte tùy ý thành struct.

## 4. Cú pháp tối thiểu

```cpp
std::uint32_t value =
    (std::uint32_t(bytes[0]) << 24) |
    (std::uint32_t(bytes[1]) << 16) |
    (std::uint32_t(bytes[2]) << 8)  |
    std::uint32_t(bytes[3]);
```

## 5. Cách nó hoạt động

1. Bốn byte fixed-width được hiểu là field 32-bit big-endian.
2. Mỗi byte được widen sang unsigned 32-bit trước khi shift, rồi bitwise OR ghép value.
3. Value đã parse in dạng hexadecimal `12345678`, còn phép copy byte riêng báo native endian order của host.

## 6. Lỗi thường gặp

- Shift signed narrow value trước khi widen có thể overflow hoặc sign-extend; copy trực tiếp struct còn kéo theo padding và host endianness.
- Trước khi áp dụng mẫu, phải kiểm tra field width, signedness, số bit shift, input length, byte order đã khai báo, overflow, bound và validation format.

## 7. Khi nào nên dùng

- Nên dùng khi đọc file, network packet, device register hoặc format có width và byte order quy định.
- Tránh dùng khi native struct layout hoặc pointer cast được dùng như đường tắt cho parsing portable.

## 8. Ví dụ đơn giản

Dãy byte 12 34 56 78 được ghép thành word big-endian. `std::memcpy` kiểm tra an toàn một byte của marker 16-bit để nhận biết host order.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Binary parsing portable tuân theo width và order của format một cách rõ ràng thay vì tin host representation.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra field width, signedness, số bit shift, input length, byte order đã khai báo, overflow, bound và validation format.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Fixed-width integers, binary parsing và endianness là gì?
2. Trung bình — Giá trị hexadecimal nào được tạo từ các byte big-endian `12 34 56 78`?
3. Khó — Vì sao mỗi byte `std::uint8_t` phải đổi sang `std::uint32_t` trước khi left shift nhiều bit?
