# Ngày 54 — Parse binary feed với `span`, `byteswap` và `expected`

## 1. Vấn đề nó giải quyết

Binary feed cần truy cập có biên, thứ tự byte tường minh và lỗi phục hồi được. `std::span` nhìn byte do bên gọi sở hữu, `std::byteswap` đổi endianness khi cần, còn `std::expected` trả trường đã parse hoặc lỗi.

## 2. Kiến thức cần có

- Ngày 26: kết quả thành công và lỗi có kiểu.
- Ngày 31: thứ tự byte và `std::byteswap`.
- Ngày 50: view không sở hữu và lifetime.

## 3. Ý tưởng cốt lõi

Hãy xem parsing như qua biên giới có kiểm soát: span nêu vùng byte có sẵn, kiểm tra size cấp quyền truy cập, memcpy tạo số nguyên an toàn và đổi endianness cho ý nghĩa trên máy. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::expected<std::uint16_t, Error> parse(std::span<const std::byte> bytes);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Parse binary feed với `span`, `byteswap` và `expected`.
1. Chương trình kiểm tra hai byte, copy vào số nguyên, đảo network order có điều kiện rồi trả kết quả có kiểu.
1. Cuối cùng, nó in hoặc kiểm tra giá trị thập phân `4660` cho hai byte `0x12 0x34` để dễ đối chiếu.

## 6. Lỗi thường gặp

- Reinterpret byte pointer không alignment thành `uint16_t*` có thể vi phạm alignment và aliasing; đảo vô điều kiện làm sai máy big-endian; bỏ kiểm tra size gây đọc ngoài biên.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi trường nhị phân format cố định nhỏ, ownership ở bên gọi và lỗi là tình huống dự kiến.
- Tránh dùng khi giao thức phức tạp chưa có thiết kế rõ về biên, version và validation.

## 8. Ví dụ đơn giản

Parser mạng đọc message code 16-bit big-endian từ hai byte và báo `too short` thay vì ném exception. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `memcpy` vào số nguyên cục bộ portable về alignment và aliasing, và vì sao sau đó vẫn cần kiểm tra native endianness riêng?
