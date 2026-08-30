# Ngày 11 — Concept subsumption và overload resolution

## 1. Vấn đề nó giải quyết

Khi nhiều constrained overload đều hợp lệ, subsumption giúp compiler chọn overload có constraint cụ thể hơn. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Custom concept, standard concept và overload.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Hãy nghĩ đến các cánh cổng lồng nhau: mọi signed integral đều là integral nên cổng signed hẹp hơn. Giá trị qua được cả hai sẽ vào overload hẹp. Hãy đọc `subsumption` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
template<class T> concept SignedInt = std::integral<T> && std::signed_integral<T>;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `subsumption`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Lặp lại các biểu thức Boolean tương đương thay vì xây concept này từ concept kia có thể khiến compiler không nhận ra thứ tự mong muốn.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi các overload tạo thành phân cấp tổng quát đến chuyên biệt thật sự.
- Tránh dùng khi một hàm duy nhất với hành vi đơn giản sẽ rõ hơn phân cấp constraint.

## 8. Ví dụ đơn giản

Một overload nhận mọi integral, overload kia nhận named concept signed-integral cụ thể hơn. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `subsumption` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `subsumption` trong ví dụ tối thiểu là gì?
2. Trung bình — Overload nào được gọi với `int`, và overload nào được gọi với `unsigned int`?
3. Khó — Vì sao hai constraint mà con người thấy tương đương logic vẫn có thể không được sắp thứ tự nếu chúng là các atomic constraint riêng?
