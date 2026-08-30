# Ngày 23 — Range-based for với initializer và range lifetime

## 1. Vấn đề nó giải quyết

Initializer của range-for C++20 tạo trạng thái chuẩn bị có tên và lifetime bao trùm toàn bộ vòng lặp. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Range-based for, scope và temporary object.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Initializer giống phòng chờ nhỏ trước loop: object tạo tại đó sống trong khi mọi iteration dùng range expression. Hãy đọc `for (init; declaration : range)` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
for (std::vector<int> values{1, 2, 3}; int value : values) { /* ... */ }
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `for (init; declaration : range)`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- View vào subobject của temporary vẫn có thể dangling; initializer nên sở hữu hoặc giữ đúng object mà range phụ thuộc.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi loop cần owner, lock, index hoặc giá trị chuẩn bị cục bộ chỉ sống trong loop.
- Tránh dùng khi object chuẩn bị còn cần sau loop hoặc range expression đơn giản vốn đã an toàn.

## 8. Ví dụ đơn giản

Một vector được tạo trong initializer rồi được duyệt an toàn để cộng tổng. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `for (init; declaration : range)` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `for (init; declaration : range)` trong ví dụ tối thiểu là gì?
2. Trung bình — Vector bị hủy lúc nào so với iteration cuối?
3. Khó — Vì sao đặt tên owner trong initializer sửa được một số lỗi lifetime của temporary nhưng không sửa mọi view vào subobject lồng nhau?
