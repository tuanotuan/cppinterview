# Ngày 38 — jthread, stop_token và automatic joining

## 1. Vấn đề nó giải quyết

`std::jthread` sở hữu thread với RAII joining và có thể truyền cooperative stop token cho worker. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Thread, atomic, RAII và join.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Nó là worker theo scope: ra khỏi scope thực hiện cleanup và join; token là biển dừng lịch sự mà worker chủ động quan sát. Hãy đọc `std::jthread` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::jthread worker([](std::stop_token token) { /* cooperative work */ });
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::jthread`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Automatic joining vẫn có thể block mãi nếu worker không kết thúc; stop request không cưỡng bức terminate code.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi thread nên gắn với scope và có thể hợp tác cancellation.
- Tránh dùng khi detached lifetime được hệ thống lớn hơn quản lý có chủ ý.

## 8. Ví dụ đơn giản

Một jthread theo scope ghi atomic result; sau scope, automatic join làm giá trị in ra an toàn và xác định. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::jthread` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::jthread` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao đọc atomic result sau block là an toàn dù không gọi `join` trực tiếp?
3. Khó — Rủi ro nào vẫn còn nếu callable bỏ qua stop token và chờ vô hạn?
