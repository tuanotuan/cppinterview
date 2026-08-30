# Ngày 25 — using enum, char8_t và safe integral comparisons

## 1. Vấn đề nó giải quyết

Các công cụ C++20 này giảm độ dài tên enum, tạo kiểu riêng cho UTF-8 code unit và tránh conversion bất ngờ khi so signed với unsigned. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Scoped enum, kiểu ký tự và số nguyên có dấu.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

`using enum` mở tập tên có scope trong vùng cục bộ, `char8_t` gắn nhãn UTF-8 code unit, còn comparison helper so giá trị số nguyên theo nghĩa toán học. Hãy đọc `std::cmp_less` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
using enum State;
bool smaller = std::cmp_less(-1, 1u);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::cmp_less`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Mở nhiều enum có thể đụng tên; `char8_t` không phải `char`; phép so thường giữa số âm signed và unsigned có thể gây bất ngờ.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi tên enum cục bộ vẫn không mơ hồ, UTF-8 code unit cần kiểu chính xác hoặc signedness khác nhau.
- Tránh dùng khi scope sẽ mơ hồ hoặc API xử lý byte yêu cầu chính xác `char`.

## 8. Ví dụ đơn giản

Chương trình import hai tên enum, lưu một UTF-8 code unit và so an toàn `-1` với `1u`. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::cmp_less` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::cmp_less` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao `std::cmp_less(-1, 1u)` cho kết quả đúng theo toán học?
3. Khó — Vì sao không thể luôn truyền `char8_t*` trực tiếp cho API nhận `const char*` dù trên hệ phổ biến cả hai code unit đều một byte?
