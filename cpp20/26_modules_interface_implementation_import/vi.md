# Ngày 26 — Module interface, implementation unit và import

## 1. Vấn đề nó giải quyết

Module cung cấp interface đã biên dịch có tên, tránh include văn bản và tách API được export khỏi implementation ẩn. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Translation unit riêng, declaration, definition và linking.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Interface là quầy dịch vụ, implementation là phòng phía sau, còn importer chỉ thấy thứ quầy chủ động export. Hãy đọc `export module` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
export module math;
export int add(int, int);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `export module`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Module thật cần nhiều translation unit và thứ tự build phụ thuộc compiler; đặt interface, implementation và importer trong một source thường không tạo module thật.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi project và toolchain quản lý được dependency scanning cùng boundary interface ổn định.
- Tránh dùng khi ví dụ portable nhỏ bắt buộc chỉ được build như một translation unit thường.

## 8. Ví dụ đơn giản

Do khóa học yêu cầu một `.cpp` chạy được mỗi ngày, chương trình in ba source fragment chính xác cần cho module nhiều tệp thật. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `export module` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `export module` trong ví dụ tối thiểu là gì?
2. Trung bình — Declaration nào làm `add` hiển thị với translation unit import?
3. Khó — Vì sao interface unit phải được compile trước importer dù việc giải quyết symbol cuối cùng vẫn có linker tham gia?
