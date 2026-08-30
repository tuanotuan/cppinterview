# Ngày 31 — Views và lazy evaluation

## 1. Vấn đề nó giải quyết

View mô tả phép biến đổi mà không tạo ngay một owning container mới chứa toàn bộ kết quả. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Range, lambda và cách duyệt bằng iterator.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

View là công thức chứ chưa phải món ăn. Mỗi phần tử được yêu cầu mới kéo lượng công việc cần thiết qua công thức. Hãy đọc `std::views` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto doubled = values | std::views::transform([](int x) { return x * 2; });
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::views`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- View có thể mượn nguồn và giữ callable state, nên lifetime nguồn và captured reference vẫn quyết định tính đúng.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi dữ liệu được filter hoặc transform theo nhu cầu và tránh intermediate container giúp rõ hoặc rẻ hơn.
- Tránh dùng khi kết quả phải được sở hữu, truy cập lặp lại theo index hoặc giữ sau khi nguồn chết.

## 8. Ví dụ đơn giản

Transform view chỉ tăng counter khi iteration yêu cầu giá trị, qua đó cho thấy tính lazy trực tiếp. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::views` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::views` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao transformation counter vẫn bằng 0 ngay sau khi tạo view?
3. Khó — Nếu lambda transform capture biến local bằng reference, object nào phải sống lâu hơn mọi lần duyệt view?
