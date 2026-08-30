# Ngày 52 — Binary parsing bằng span, byte, bit_cast và endian

## 1. Vấn đề nó giải quyết

Binary parsing an toàn phải chặn mọi lần đọc theo biên, biểu diễn raw byte rõ ràng, copy object representation hợp lệ và chuẩn hóa byte order ngoài. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Span, byte representation, bit operation và endian ở Ngày 28 và 36.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Span là biên packet, `std::byte` nói “raw data”, `bit_cast` dựng representation cùng size, còn endian logic dịch wire order. Hãy đọc `std::span<const std::byte>` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::span<const std::byte> packet{raw};
auto value = std::bit_cast<std::uint32_t>(field);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::span<const std::byte>`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Đọc quá span là sai; cast byte pointer không aligned sang integer pointer có thể vi phạm alignment và aliasing; native endian không phải wire endian.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi binary field cố định có width và byte order được mô tả.
- Tránh dùng khi format là text, variable-length chưa validate hoặc cần schema phức tạp hơn.

## 8. Ví dụ đơn giản

Bốn byte little-endian cố định được copy vào array, bit-cast thành `uint32_t` rồi normalize trên big-endian host. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::span<const std::byte>` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::span<const std::byte>` trong ví dụ tối thiểu là gì?
2. Trung bình — Giá trị hexadecimal nào được parse từ byte `78 56 34 12` theo little-endian?
3. Khó — Vì sao copy vào `std::array<std::byte,4>` rồi bit-cast an toàn hơn dereference `reinterpret_cast<uint32_t*>` vào packet?
