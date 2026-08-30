# Ngày 21 — std::lexicographical_compare_three_way

## 1. Vấn đề nó giải quyết

Thuật toán này so hai dãy từng phần tử và trả comparison category thay vì chỉ một Boolean “nhỏ hơn”. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Iterator, range và comparison category.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Nó giống thứ tự từ điển: tìm cặp đầu tiên khác nhau; nếu không có, dãy ngắn hơn đứng trước, còn cùng độ dài thì bằng nhau. Hãy đọc `std::lexicographical_compare_three_way` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto order = std::lexicographical_compare_three_way(a.begin(), a.end(), b.begin(), b.end());
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::lexicographical_compare_three_way`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Truyền cặp iterator không hợp lệ gây undefined behavior; custom comparator cũng phải trả comparison category phù hợp.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi hai dãy cần một category result phân biệt nhỏ hơn, bằng và lớn hơn.
- Tránh dùng khi caller chỉ cần kiểm tra bằng nhau hoặc Boolean lexicographical nhỏ hơn.

## 8. Ví dụ đơn giản

Hai array khác ở phần tử cuối, và thuật toán báo dãy đầu nhỏ hơn. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::lexicographical_compare_three_way` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::lexicographical_compare_three_way` trong ví dụ tối thiểu là gì?
2. Trung bình — Cặp phần tử nào quyết định kết quả cho `{1,2,3}` và `{1,2,4}`?
3. Khó — Nếu mọi phần tử trong prefix chung đều tương đương, độ dài dãy quyết định category result thế nào?
