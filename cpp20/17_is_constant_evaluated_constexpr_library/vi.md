# Ngày 17 — is_constant_evaluated và constexpr standard library

## 1. Vấn đề nó giải quyết

Đôi khi cùng một interface cần đường thực thi khác nhau ở constant evaluation và runtime nhưng vẫn chỉ dùng một hàm. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Hàm constexpr, mảng và assertion lúc biên dịch.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

`std::is_constant_evaluated()` là cảm biến bên trong hàm `constexpr`, cho biết lời gọi hiện tại đang ở thế giới compile time hay runtime. Hãy đọc `std::is_constant_evaluated` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
if (std::is_constant_evaluated()) { return value + 1; }
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::is_constant_evaluated`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Kiểm tra nó trong ngữ cảnh vốn bắt buộc constant-evaluated sẽ cho kết quả true dễ đoán và có thể làm runtime probe bị hiểu sai.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi thuật toán constexpr cần một đường hợp lệ lúc biên dịch và một đường tối ưu hoặc có đo đạc ở runtime.
- Tránh dùng khi cả hai ngữ cảnh dùng chung được một implementation đơn giản.

## 8. Ví dụ đơn giản

Một hàm trả offset khác nhau ở compile time và runtime; `std::array` constexpr xác minh kết quả compile time. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::is_constant_evaluated` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::is_constant_evaluated` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao giá trị trong `static_assert` và giá trị in runtime khác nhau dù đối số số học giống nhau?
3. Khó — Vì sao thường nên gọi trực tiếp `std::is_constant_evaluated()` trong điều kiện nhánh thay vì cache nó ở ngữ cảnh gây hiểu nhầm?
