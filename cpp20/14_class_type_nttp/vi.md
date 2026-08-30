# Ngày 14 — Class types trong non-type template parameters

## 1. Vấn đề nó giải quyết

C++20 cho phép giá trị class structural phù hợp làm template argument, nhờ đó dữ liệu compile time như chuỗi cố định trở nên dễ đọc. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Class template, constexpr và non-type parameter.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Chính giá trị trở thành một phần identity của template. Hai fixed string khác nhau vì vậy tạo hai specialization khác nhau. Hãy đọc `template<FixedString Name>` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
template<FixedString Name>
void greet();
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `template<FixedString Name>`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Chỉ structural type mới hợp lệ; private member, mutable member hoặc subobject không phù hợp sẽ làm class không dùng được làm NTTP.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi giá trị compile time nhỏ, bất biến cần tham gia vào specialization hoặc type identity.
- Tránh dùng khi giá trị thay đổi runtime hoặc không cần tạo specialization riêng.

## 8. Ví dụ đơn giản

Một `FixedString` structural mang tên lời chào vào function specialization rồi in tên đó. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `template<FixedString Name>` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `template<FixedString Name>` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao `greet<"Ada">` và `greet<"Lin">` là hai function specialization khác nhau?
3. Khó — Đổi mảng ký tự thành private sẽ vi phạm quy tắc structural type nào, và vì sao access control lại quan trọng?
