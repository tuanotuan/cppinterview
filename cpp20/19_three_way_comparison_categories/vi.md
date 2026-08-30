# Ngày 19 — Three-way comparison và comparison categories

## 1. Vấn đề nó giải quyết

Three-way comparison tạo một kết quả ordering có thể hỗ trợ nhiều toán tử quan hệ và giữ thông tin thứ tự strong, weak hay partial. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Toán tử so sánh, class và suy luận kiểu.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Thay vì hỏi sáu câu đúng/sai riêng, `<=>` trả về chiếc la bàn chỉ nhỏ hơn, bằng, lớn hơn hoặc unordered nếu category cho phép. Hãy đọc `operator<=>` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto operator<=>(const Measurement&) const = default;
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `operator<=>`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Member số thực thường tạo `std::partial_ordering` vì NaN có thể unordered; giả định strong ordering có thể phá kỳ vọng của sorted container.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi kiểu có thứ tự nhất quán và cần sinh các phép quan hệ đồng bộ.
- Tránh dùng khi miền bài toán không có thứ tự toàn phần hoặc bán phần có ý nghĩa.

## 8. Ví dụ đơn giản

Một measurement có member `double` dùng spaceship mặc định và bộc lộ category partial ordering. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `operator<=>` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `operator<=>` trong ví dụ tối thiểu là gì?
2. Trung bình — Kết quả Boolean nào được in khi so measurement `2.5` với `3.0`?
3. Khó — Vì sao comparison mặc định chứa `double` thường không suy luận thành `std::strong_ordering`?
