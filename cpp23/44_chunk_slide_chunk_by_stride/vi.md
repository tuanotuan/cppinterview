# Ngày 44 — View chunk, slide, chunk-by và stride

## 1. Vấn đề nó giải quyết

Các bài toán gom nhóm cần quy tắc di chuyển khác nhau. C++23 thêm chunk cố định không chồng, slide chồng, nhóm kề nhau theo predicate và bước stride đều qua range.

## 2. Kiến thức cần có

- Ngày 43: cửa sổ adjacent chồng nhau.
- Predicate và range adaptor lười.

## 3. Ý tưởng cốt lõi

`chunk` cắt ổ bánh, `slide` đẩy cửa sổ, `chunk_by` giữ hàng xóm cùng nhóm khi quan hệ đúng, còn `stride` lấy mẫu mỗi n vị trí. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto groups = range | std::views::chunk(3);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho View chunk, slide, chunk-by và stride.
1. Chương trình áp dụng cả bốn quy tắc nhóm hoặc lấy mẫu lên một dãy cố định nhỏ khi được hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra các nhóm, cửa sổ, run và phần tử lấy mẫu khác nhau rõ ràng để dễ đối chiếu.

## 6. Lỗi thường gặp

- Chunk size hoặc stride bằng zero vi phạm precondition; predicate `chunk_by` phải mô tả quan hệ giữa phần tử kề nhau chứ không phải test bucket toàn cục.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi chia batch, rolling window, nhóm run và down-sample đều.
- Tránh dùng khi mẫu truy cập ngẫu nhiên hoặc gom nhóm phụ thuộc trạng thái toàn cục không kề nhau.

## 8. Ví dụ đơn giản

Luồng cảm biến được chunk để upload, slide để phân tích động, nhóm theo run trạng thái và lấy mỗi số đo thứ hai. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `chunk_by(eq)` chỉ nhóm đúng giá trị bằng nhau khi chúng kề nhau, và giá trị bằng nhau xuất hiện lại sau giá trị khác sẽ thế nào?
