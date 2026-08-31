# Ngày 23 — Character set, escape sequence và tính portable của `char8_t`

## 1. Vấn đề nó giải quyết

Ký tự nguồn, Unicode code point và byte mã hóa là các lớp khác nhau. C++23 làm rõ quy tắc encoding nguồn, còn `char8_t` đưa ý định UTF-8 vào hệ kiểu.

## 2. Kiến thức cần có

- Ngày 1: khác biệt compiler và nền tảng.
- Ngày 20: kiểu do implementation cung cấp.

## 3. Ý tưởng cốt lõi

Escape như `\u1EC7` chỉ một code point. Literal `u8` mã hóa nó thành các code unit UTF-8 kiểu `char8_t`; một ký tự hiển thị có thể chiếm nhiều unit. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
constexpr char8_t text[] = u8"Vi\u1EC7t";
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Character set, escape sequence và tính portable của `char8_t`.
1. Chương trình kiểm tra kiểu phần tử và báo số code unit UTF-8.
1. Cuối cùng, nó in hoặc kiểm tra sáu code unit cho đoạn tiếng Việt cố định để dễ đối chiếu.

## 6. Lỗi thường gặp

- Đưa trực tiếp `char8_t*` vào `std::cout` không portable, và đánh chỉ số byte UTF-8 như mỗi byte là một ký tự sẽ làm hỏng văn bản ngoài ASCII.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi đánh dấu rõ storage hoặc interface UTF-8 và đếm byte khi thật sự cần byte.
- Tránh dùng khi dùng chỉ số code unit cho thao tác ký tự người dùng nhìn thấy mà không decode Unicode.

## 8. Ví dụ đơn giản

Payload mạng lưu nhãn UTF-8 trong `std::u8string` và kiểm tra byte trước khi chuyển để hiển thị. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `sizeof(u8"ệ") - 1` lớn hơn một dù mã nguồn trông chỉ chứa một ký tự?
