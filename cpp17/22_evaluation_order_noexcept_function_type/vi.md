# Ngày 22 — Evaluation order và noexcept trong function type

## 1. Vấn đề nó giải quyết

Evaluation operand không rõ có thể làm side effect bất ngờ, còn exception specification trước đây tham gia hạn chế vào type relationship. C++17 tăng một số sequencing rule và đưa `noexcept` vào function type.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết side effect, sequencing, function pointer, exception specification và `std::is_nothrow_invocable`.

## 3. Ý tưởng cốt lõi

Với assignment trong C++17, right operand được sequenced trước left operand. Riêng function pointer type có thể yêu cầu function không throw, cho phép phân biệt compile time giữa target có thể throw và `noexcept`.

## 4. Cú pháp tối thiểu

```cpp
using Safe = void (*)() noexcept;
Safe action = &safe_action;
values[index()] = produce();
```

## 5. Cách nó hoạt động

1. Helper có logging làm lộ việc evaluate right side của assignment trước indexed left side.
2. Function pointer `noexcept` cùng type trait sau đó kiểm tra non-throwing callable contract.
3. Chương trình in `value` trước `index`, rồi số đã lưu và text từ safe action, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- C++17 không áp dụng quy tắc left-to-right đơn giản cho mọi function argument; không dựa vào order nếu không có sequencing rule cụ thể.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi review expression có side effect hoặc mã hóa non-throwing callback contract trong type.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Assignment dùng function logging riêng để order nhìn thấy được. Static assertion xác nhận function pointer được chọn là nothrow-invocable.

## 9. Điều cần nhớ

- Suy luận từ sequencing rule chính xác và xem `noexcept` là một phần callable type compatibility trong C++17.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Evaluation order và noexcept trong function type giải quyết vấn đề chính nào?
2. Trung bình — Từ logging nào xuất hiện trước trong assignment expression?
3. Khó — Conversion nào được phép giữa throwing và non-throwing function pointer?
