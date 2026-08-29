# Ngày 19 — std::exchange và chuyển đổi trạng thái bằng move

## 1. Vấn đề nó giải quyết

Code chuyển trạng thái thường cần cả giá trị cũ lẫn giá trị thay thế. `std::exchange` của C++14 move hoặc copy giá trị cũ ra, gán giá trị mới rồi trả lại giá trị cũ trong một biểu thức rõ ràng.

## 2. Kiến thức cần có

- Ngày 3 và 18: move semantics, phép gán, trạng thái cũ và mới của object cùng chuyển ownership.

## 3. Ý tưởng cốt lõi

Hãy đọc `exchange(object, replacement)` là lấy-rồi-thay: lưu trạng thái hiện tại, gán giá trị thay thế rồi đưa trạng thái đã lưu cho nơi gọi.

## 4. Cú pháp tối thiểu

```cpp
auto old_state = std::exchange(state, new_state);
```

## 5. Cách nó hoạt động

1. Giá trị hiện tại khởi tạo kết quả của hàm, dùng move construction khi phù hợp.
2. Giá trị thay thế được gán vào object gốc trước khi giá trị cũ đã lưu được trả về.
3. Nơi gọi nhận trạng thái cũ trong khi biến gốc đã chứa trạng thái mới.

## 6. Lỗi thường gặp

- Nhầm `std::exchange` với `std::swap` là sai vì swap cập nhật cả hai object và không trả giá trị.
- Trước khi áp dụng mẫu, phải kiểm tra giá trị cũ sau move, chi phí assignment, phép chuyển replacement và hành vi exception.

## 7. Khi nào nên dùng

- Nên dùng khi state machine, move operation, reset handle hoặc chuyển counter cần giữ trạng thái trước đó.
- Tránh dùng khi phép gán thông thường đã đủ và giá trị cũ không được dùng.

## 8. Ví dụ đơn giản

Trạng thái số nguyên đổi từ 7 sang 0. Giá trị cũ được trả về và biến đã cập nhật được in cạnh nhau, làm hành vi lấy-rồi-thay rất rõ.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- `std::exchange` đóng gói thao tác chuyển trạng thái phổ biến nhưng vẫn giữ được giá trị trước đó.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra giá trị cũ sau move, chi phí assignment, phép chuyển replacement và hành vi exception.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của std::exchange và chuyển đổi trạng thái bằng move là gì?
2. Trung bình — Sau `old = std::exchange(state, 0)` khi `state` đang là 7, hai biến có giá trị gì?
3. Khó — Trong move assignment operator, vì sao `std::exchange(other.pointer, nullptr)` có thể diễn đạt cùng lúc chuyển ownership và reset nguồn?
