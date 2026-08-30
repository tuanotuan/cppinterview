# Ngày 18 — Constexpr virtual functions và explicit(bool)

## 1. Vấn đề nó giải quyết

C++20 mở rộng OOP lúc biên dịch và cho constructor trở thành explicit hoặc implicit theo một điều kiện Boolean hằng. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Virtual function, constructor, constexpr và type trait.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Constexpr virtual call có thể dispatch khi concrete object được biết trong constant evaluation; `explicit(bool)` là công tắc compile time cho chính sách chuyển đổi. Hãy đọc `explicit(bool)` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
explicit(!std::is_convertible_v<T, int>) constexpr Box(T value);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `explicit(bool)`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Virtual dispatch không constant-evaluate được nếu dynamic type không dùng được trong ngữ cảnh constant expression; implicit conversion có điều kiện cũng dễ làm API tinh tế quá mức.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi polymorphic object lúc biên dịch thật sự hữu ích hoặc độ an toàn chuyển đổi phụ thuộc thuộc tính kiểu.
- Tránh dùng khi constructor explicit thường và constexpr không virtual đã đủ.

## 8. Ví dụ đơn giản

Một constexpr virtual function ở derived class được kiểm tra bằng `static_assert`, còn box nhỏ dùng conditional explicitness. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `explicit(bool)` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `explicit(bool)` trong ví dụ tối thiểu là gì?
2. Trung bình — Implementation nào cung cấp giá trị trong virtual call lúc biên dịch?
3. Khó — Đổi template argument có thể làm copy-initialization được nhận hoặc bị từ chối thế nào dù declaration của constructor không đổi về mặt văn bản?
