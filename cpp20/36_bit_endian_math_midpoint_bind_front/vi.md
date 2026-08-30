# Ngày 36 — bit_cast, endian, bit operations, math constants, midpoint và bind_front

## 1. Vấn đề nó giải quyết

C++20 chuẩn hóa nhiều utility low-level và số học để thay unsafe cast, bit trick tự viết, magic constant và wrapper lặp lại. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Object representation, số nguyên, hàm và phép toán số.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Mỗi utility đặt tên một ý định hẹp: copy representation, nhận byte order, xem bit, dùng hằng, tìm điểm giữa an toàn hoặc bind argument đầu. Hãy đọc `std::bit_cast` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto bits = std::bit_cast<std::uint32_t>(value);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::bit_cast`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- `bit_cast` yêu cầu hai type cùng size và trivially copyable; endian vẫn quan trọng khi byte đi qua file hoặc network.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi phép chuẩn hóa cụ thể khớp đúng tác vụ low-level hoặc số học.
- Tránh dùng khi cần semantic value conversion thay vì copy representation.

## 8. Ví dụ đơn giản

Chương trình xem bit của `1.0f`, báo native endian, đếm bit, dùng pi, tính midpoint và bind một số hạng. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::bit_cast` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::bit_cast` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao `std::midpoint(a,b)` an toàn hơn `(a+b)/2` với số nguyên lớn?
3. Khó — Vì sao `bit_cast` thành công vẫn không biến integer kết quả thành serialized representation portable giữa máy khác endian?
