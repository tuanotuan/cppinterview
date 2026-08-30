# Ngày 28 — span, static extent và dynamic extent

## 1. Vấn đề nó giải quyết

`std::span` truyền dãy phần tử liên tục mà không copy hay sở hữu, với kích thước nằm trong kiểu hoặc được giữ ở runtime. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Mảng liên tục, container và quy tắc lifetime không sở hữu.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Span là cửa sổ nhìn vào storage có sẵn. Static extent khắc kích thước vào type; dynamic extent mang kích thước cạnh pointer. Hãy đọc `std::span` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::span<int, 3> fixed{data};
std::span<int> dynamic{data};
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::span`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Span không kéo dài lifetime của nguồn; tạo fixed-extent span từ số phần tử sai là không hợp lệ.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi hàm cần view pointer-kèm-count an toàn trên array, `std::array` hoặc vector.
- Tránh dùng khi callee phải sở hữu, resize hoặc giữ dữ liệu lâu hơn nguồn.

## 8. Ví dụ đơn giản

Fixed span và dynamic span nhìn cùng mảng ba phần tử và bộc lộ hằng `extent` khác nhau. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::span` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::span` trong ví dụ tối thiểu là gì?
2. Trung bình — Extent nào nằm trong type, còn kích thước nào được lưu ở runtime?
3. Khó — Vì sao chuyển `std::span<int>` sang `std::span<int, 3>` có thể cần runtime precondition dù extent đích là compile-time?
