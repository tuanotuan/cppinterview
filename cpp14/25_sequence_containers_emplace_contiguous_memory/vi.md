# Ngày 25 — Sequence containers, emplace và contiguous memory

## 1. Vấn đề nó giải quyết

Sequence container cùng có interface theo thứ tự nhưng khác cách lưu và invalidation. `std::vector` lưu phần tử liên tục, còn `emplace_back` dựng phần tử mới trực tiếp từ constructor argument được truyền.

## 2. Kiến thức cần có

- Ngày 6 và 21: container chuẩn, constructor, iterator, move, lifetime và RAII.

## 3. Ý tưởng cốt lõi

Hãy chọn hành vi lưu trữ trước: vector là mảng tăng trưởng với các phần tử kề nhau thân thiện cache. Reserve khi đoán được số phần tử, rồi emplace khi construction trực tiếp thể hiện ý định rõ hơn.

## 4. Cú pháp tối thiểu

```cpp
std::vector<std::pair<int, std::string>> rows;
rows.reserve(2);
rows.emplace_back(1, "one");
```

## 5. Cách nó hoạt động

1. Reserve cấp trước capacity liên tục đủ dùng trước khi chèn phần tử.
2. `emplace_back` forward argument để dựng từng pair ngay trong vùng lưu trữ của vector.
3. Ví dụ in hai record và xác nhận địa chỉ phần tử kề nhau chênh đúng một kích thước phần tử.

## 6. Lỗi thường gặp

- Cho rằng `emplace_back` luôn nhanh hơn là bỏ qua conversion, độ rõ và reallocation; nó còn có thể gọi constructor ngoài ý muốn.
- Trước khi áp dụng mẫu, phải kiểm tra bảo đảm lưu trữ của container, tăng capacity, iterator invalidation, constructor overload và phép đo thật.

## 7. Khi nào nên dùng

- Nên dùng khi cần duyệt theo index nhanh, lưu liên tục và phần tử chủ yếu được thêm ở cuối.
- Tránh dùng khi yêu cầu chính là iterator ổn định khi chèn giữa hoặc chèn hai đầu constant-time.

## 8. Ví dụ đơn giản

Vector giữ các pair ID/tên. Capacity được reserve một lần, pair được dựng từ argument rời và phép toán địa chỉ minh họa vùng nhớ liên tục.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Lựa chọn container quyết định layout và invalidation; emplace chỉ thay đổi cách dựng một phần tử.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra bảo đảm lưu trữ của container, tăng capacity, iterator invalidation, constructor overload và phép đo thật.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Sequence containers, emplace và contiguous memory là gì?
2. Trung bình — Vì sao reserve capacity trước hai lần chèn giúp giữ địa chỉ phần tử ổn định trong các lần chèn đó?
3. Khó — Khi nào `emplace_back(args...)` có thể chọn constructor hoặc implicit conversion mà `push_back(value)` làm rõ hơn?
