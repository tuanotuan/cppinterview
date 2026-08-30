# Ngày 9 — Standard concepts library

## 1. Vấn đề nó giải quyết

Thư viện chuẩn cung cấp các vocabulary concept phổ biến để interface generic diễn đạt quan hệ kiểu một cách nhất quán. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Custom concept và template có ràng buộc.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Hãy dùng standard concept như nhãn chung trên cửa thư viện. Người đọc và compiler đã thống nhất ý nghĩa của `integral`, `same_as` hay `invocable`. Hãy đọc `std::integral` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
void show(std::integral auto value);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::integral`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Chọn concept chỉ vì một ví dụ biên dịch được có thể loại kiểu hợp lệ; hãy dùng hợp đồng yếu nhất mà thuật toán thật sự cần.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi standard concept mô tả chính xác yêu cầu công khai.
- Tránh dùng khi miền bài toán có quy tắc ngữ nghĩa mạnh hơn và cần custom concept.

## 8. Ví dụ đơn giản

Hai overload dùng `std::integral` và `std::floating_point` để phân loại đầu vào cố định. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::integral` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::integral` trong ví dụ tối thiểu là gì?
2. Trung bình — Overload nào nhận `42u`, và vì sao overload resolution không cần kiểm tra runtime?
3. Khó — Vì sao `std::convertible_to<T, int>` không thể thay thế tùy ý cho `std::same_as<T, int>` trong hợp đồng API?
