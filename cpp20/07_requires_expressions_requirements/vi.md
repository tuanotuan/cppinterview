# Ngày 7 — Requires expressions và các loại requirement

## 1. Vấn đề nó giải quyết

Requires expression hỏi trước khi chọn template rằng một kiểu có hỗ trợ cú pháp và thuộc tính cụ thể hay không. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Template, biểu thức và type trait ở Ngày 3.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Nó là checklist lúc biên dịch. Simple, type, compound và nested requirement lần lượt kiểm tra hợp đồng kiểu với mức chính xác tăng dần. Hãy đọc `requires` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
requires(T a, T b) {
    typename T::value_type;
    { a + b } -> std::same_as<T>;
}
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `requires`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Requirement chỉ kiểm tra tính hợp lệ; nó không thực thi biểu thức và không xác nhận giá trị runtime.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi template cần hợp đồng cấu trúc có thể mô tả bằng kiểu hoặc biểu thức hợp lệ.
- Tránh dùng khi điều kiện phụ thuộc dữ liệu runtime thay vì interface của kiểu.

## 8. Ví dụ đơn giản

Một concept kiểm tra nested `value_type`, phép cộng, kiểu kết quả và điều kiện về kích thước. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `requires` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `requires` trong ví dụ tối thiểu là gì?
2. Trung bình — Requirement nào thất bại trước với kiểu không có `value_type` nhưng vẫn hỗ trợ `operator+`?
3. Khó — Vì sao `{ a + b } -> std::same_as<T>` kiểm tra nhiều hơn simple requirement `a + b;`?
