# Ngày 16 — [[deprecated]] và vòng đời API

## 1. Vấn đề nó giải quyết

Xóa API cũ ngay lập tức làm hỏng code người dùng, nhưng giữ im lặng lại khuyến khích phụ thuộc mới. Attribute chuẩn `[[deprecated]]` giữ declaration còn dùng được đồng thời yêu cầu compiler cảnh báo nơi gọi và có thể chỉ ra cách thay thế.

## 2. Kiến thức cần có

- Cảnh báo ngày 1; hàm, khai báo, call site và ý tưởng duy trì public API theo thời gian.

## 3. Ý tưởng cốt lõi

Deprecation là tín hiệu migration theo giai đoạn, không phải xóa ngay. Trước hết thêm bản thay thế, sau đó đánh dấu entry point cũ, chuyển call site rồi chỉ xóa ở bản breaking change đã thông báo.

## 4. Cú pháp tối thiểu

```cpp
[[deprecated("use new_total instead")]]
int old_total(int a, int b);
```

## 5. Cách nó hoạt động

1. Attribute gắn thông điệp chẩn đoán vào declaration cũ nhưng vẫn giữ signature và hành vi nhị phân.
2. Compiler phù hợp chuẩn có thể phát cảnh báo khi source code gọi hoặc nhắc tới declaration đó.
3. Ví dụ dùng API thay thế nên biên dịch sạch, đồng thời vẫn để declaration cũ đã đánh dấu cho người học quan sát.

## 6. Lỗi thường gặp

- Đánh dấu API deprecated mà không có thông điệp migration hoặc bản thay thế dùng được khiến người gọi không biết phải làm gì.
- Trước khi áp dụng mẫu, phải kiểm tra đường thay thế, chính sách cảnh báo, thời gian tương thích, tài liệu và phiên bản dự kiến xóa.

## 7. Khi nào nên dùng

- Nên dùng khi interface công khai hiện có phải tạm thời còn dùng trong lúc call site chuyển sang thiết kế an toàn hơn.
- Tránh dùng khi declaration chưa từng phát hành hoặc có thể đổi tên an toàn trước khi ai phụ thuộc.

## 8. Ví dụ đơn giản

File khai báo `old_total` kèm thông điệp thay thế và chỉ gọi `new_total`. Có thể chủ động bỏ comment lời gọi cũ để quan sát cảnh báo compiler.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Deprecation tốt phải có bản thay thế, giai đoạn migration và chính sách xóa rõ ràng.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra đường thay thế, chính sách cảnh báo, thời gian tương thích, tài liệu và phiên bản dự kiến xóa.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của [[deprecated]] và vòng đời API là gì?
2. Trung bình — Lời gọi hàm nào trong ví dụ biên dịch mà không có deprecation warning, và vì sao?
3. Khó — Vì sao đổi hành vi phía sau signature đã deprecated nguy hiểm hơn giữ tương thích trong giai đoạn migration?
