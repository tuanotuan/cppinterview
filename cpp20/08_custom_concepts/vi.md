# Ngày 8 — Định nghĩa custom concepts

## 1. Vấn đề nó giải quyết

Custom concept đặt tên có ý nghĩa cho một hợp đồng compile time có thể tái sử dụng đối với tham số template. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Requires expression và template ở Ngày 7.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Concept giống cánh cổng có tên: kiểu đi qua khi ràng buộc Boolean đúng, và phần code phía sau được phép dựa vào hợp đồng đã nêu. Hãy đọc `concept` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
template<class T>
concept Addable = requires(T a, T b) { { a + b } -> std::same_as<T>; };
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `concept`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Concept kiểm tra cú pháp tình cờ thay vì nhu cầu thật có thể nhận kiểu gây hiểu nhầm hoặc siết API quá mức.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi cùng một quy tắc miền nghiệp vụ ràng buộc nhiều template và cần tên dễ đọc.
- Tránh dùng khi điều kiện chỉ dùng một lần và standard concept ngắn đã diễn đạt chính xác.

## 8. Ví dụ đơn giản

Concept `Addable` nhận các giá trị có phép cộng trả về cùng kiểu và ràng buộc hàm nhỏ `twice`. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `concept` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `concept` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao concept từ chối kiểu có `operator+` trả về một proxy không liên quan?
3. Khó — Một biểu thức `a + b` hợp lệ về cú pháp vẫn có thể sai ý nghĩa “cộng được” như thế nào, và điều đó dạy gì về thiết kế concept?
