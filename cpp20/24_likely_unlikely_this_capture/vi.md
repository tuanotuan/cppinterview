# Ngày 24 — likely, unlikely và explicit capture của this

## 1. Vấn đề nó giải quyết

Attribute dự đoán nhánh truyền optimization hint, còn explicit capture `this` làm sự phụ thuộc của lambda vào object hiện rõ. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Điều kiện, lambda, class và capture.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Attribute là dự báo giao thông, không phải luật; `[this]` là sợi cáp trỏ về object hiện tại chứ không sao chép toàn object. Hãy đọc `[[likely]]` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
if (condition) [[likely]] { /* common path */ }
auto f = [this] { return value; };
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `[[likely]]`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Hint sai có thể làm hiệu năng kém hơn; lambda capture `this` sẽ dangling nếu chạy sau khi object đã chết.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi profiling chứng minh một nhánh lệch mạnh hoặc lambda sống ngắn cần truy cập member.
- Tránh dùng khi hành vi nhánh chưa biết hoặc callback có thể sống lâu hơn object.

## 8. Ví dụ đơn giản

Một counter trả lambda `[this]` và đánh dấu nhánh dương thông thường là likely. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `[[likely]]` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `[[likely]]` trong ví dụ tối thiểu là gì?
2. Trung bình — `[this]` có copy toàn bộ object không, và lambda đọc member nào?
3. Khó — Vì sao lifetime bug do `[this]` không thay đổi dù nhánh được đánh dấu có thật sự likely hay không?
