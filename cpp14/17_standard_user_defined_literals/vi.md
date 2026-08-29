# Ngày 17 — Standard user-defined literals cho string, chrono và complex

## 1. Vấn đề nó giải quyết

Literal thô như `"hello"` hoặc `250` tự nó không biểu thị owning string, đơn vị thời gian hay số ảo. Hậu tố literal chuẩn của C++14 tạo trực tiếp giá trị thư viện có kiểu rõ.

## 2. Kiến thức cần có

- Ngày 1-2; namespace, `std::string`, numeric literal và kiểu thư viện chuẩn cơ bản.

## 3. Ý tưởng cốt lõi

Suffix hoạt động như phép chuyển compile-time được tìm qua namespace. Token vẫn ngắn nhưng kiểu kết quả mang theo ý nghĩa ownership hoặc đơn vị cho các phép toán sau.

## 4. Cú pháp tối thiểu

```cpp
using namespace std::string_literals;
auto text = "C++14"s;
using namespace std::chrono_literals;
auto delay = 250ms;
```

## 5. Cách nó hoạt động

1. Đưa literal namespace vào scope làm các hậu tố chuẩn của namespace đó khả dụng.
2. Mỗi suffix tạo kiểu khác nhau: `std::string`, chrono duration hoặc `std::complex`.
3. Chương trình in chuỗi, số mili giây và phần ảo trong khi vẫn giữ đúng ý nghĩa kiểu.

## 6. Lỗi thường gặp

- Quên namespace literal phù hợp làm suffix không được tìm thấy, còn import namespace quá rộng có thể gây mơ hồ hậu tố.
- Trước khi áp dụng mẫu, phải kiểm tra namespace của suffix, kiểu thư viện kết quả, đơn vị, độ chính xác và overload được chọn.

## 7. Khi nào nên dùng

- Nên dùng khi suffix chuẩn làm ownership hoặc đơn vị hiện rõ và ngăn trộn các số thô không cùng ý nghĩa.
- Tránh dùng khi team không quen suffix hoặc hằng có tên diễn đạt ý nghĩa domain tốt hơn.

## 8. Ví dụ đơn giản

Ví dụ tạo owning string bằng `s`, duration bằng `ms` và số phức thuần ảo bằng `i`. Member function tương ứng cho thấy ba kiểu khác nhau.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Standard literal đưa đơn vị và loại giá trị thư viện vào type system.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra namespace của suffix, kiểu thư viện kết quả, đơn vị, độ chính xác và overload được chọn.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Standard user-defined literals cho string, chrono và complex là gì?
2. Trung bình — Các biểu thức `"C++14"s`, `250ms` và `2.0i` tạo kiểu gì?
3. Khó — Vì sao `250ms + 1s` giữ phép toán an toàn về đơn vị tốt hơn cộng hai số nguyên không có kiểu đơn vị?
