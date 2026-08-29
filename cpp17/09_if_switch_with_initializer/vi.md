# Ngày 9 — if và switch với initializer

## 1. Vấn đề nó giải quyết

Kết quả lookup hoặc parsed state thường chỉ cần tên trong một quyết định rẽ nhánh. Khai báo sớm làm tên rò ra scope rộng hơn và tách initialization khỏi test.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết block scope, iterator, lookup của associative container cùng `if` và `switch` thường.

## 3. Ý tưởng cốt lõi

C++17 cho phép `if (init; condition)` và `switch (init; condition)`. Tên được khởi tạo tồn tại trong các branch rồi bị hủy khi toàn statement kết thúc.

## 4. Cú pháp tối thiểu

```cpp
if (auto it = scores.find("Ada"); it != scores.end()) {
    use(it->second);
}
```

## 5. Cách nó hoạt động

1. Lookup iterator được khởi tạo ngay trong header `if` rồi lập tức so sánh với map end.
2. Iterator có trong cả hai branch nhưng không tồn tại sau statement, tránh vô tình dùng lại stale value.
3. Chương trình in `Ada: 91` rồi classification `excellent`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Initializer và condition dùng semicolon chứ không phải comma; tên được khởi tạo tồn tại cả trong `else`.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi helper object chỉ thuộc về một conditional statement.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Map iterator được giới hạn trong `if`, còn bản sao score được giới hạn trong `switch` phân loại kết quả.

## 9. Điều cần nhớ

- Statement initializer giữ acquisition, test và destruction cùng nhau trong scope hẹp nhất.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — if và switch với initializer giải quyết vấn đề chính nào?
2. Trung bình — Lookup iterator sống ở đâu, và có thể gọi tên nó sau `if` không?
3. Khó — Destruction hoạt động thế nào khi initializer sở hữu lock dùng chung cho hai branch?
