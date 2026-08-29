# Ngày 47 — Cache locality và data-oriented design

## 1. Vấn đề nó giải quyết

Thuật toán đúng vẫn có thể tốn thời gian chờ memory khi working data rải rác hoặc trộn với field không dùng. Cache locality giữ truy cập gần nhau trong memory gần nhau, còn data-oriented design sắp dữ liệu quanh thao tác xử lý.

## 2. Kiến thức cần có

- Ngày 24-26 và 45: layout, vector liên tục, iteration, cache line, false sharing và profiling.

## 3. Ý tưởng cốt lõi

Hỏi hot loop đọc những field nào cùng nhau rồi lưu và duyệt các field đó liên tục. Structure of arrays có thể tốt hơn array of structures khi một pass chỉ chạm vài component.

## 4. Cú pháp tối thiểu

```cpp
std::vector<double> position{...};
std::vector<double> velocity{...};
for (std::size_t i = 0; i < position.size(); ++i)
    position[i] += velocity[i] * dt;
```

## 5. Cách nó hoạt động

1. Position và velocity được lưu trong hai array liên tục có index tương ứng.
2. Update loop đi tuần tự qua cả hai array, cho hardware prefetching access pattern đơn giản.
3. Mọi position được cập nhật xác định và code cho thấy chính xác field nào bị hot loop chạm.

## 6. Lỗi thường gặp

- Tổ chức lại dữ liệu vì lợi ích cache phỏng đoán mà không profiling có thể làm code khó hiểu và tối ưu sai loop.
- Trước khi áp dụng mẫu, phải kiểm tra hot access pattern, contiguity, stride, working-set size, vectorization, branch behavior và cache metric từ profiler.

## 7. Khi nào nên dùng

- Nên dùng khi profiling cho thấy memory stall trong hot loop xử lý nhiều record giống nhau.
- Tránh dùng khi data rất nhỏ hoặc độ rõ domain và invariant quan trọng hơn thay đổi layout chưa đo.

## 8. Ví dụ đơn giản

Update position chỉ chạm array position và velocity. Ba particle di chuyển một time step rồi output cho position mới.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Data-oriented design bắt đầu từ access pattern đã đo, không phải layout theo trào lưu.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra hot access pattern, contiguity, stride, working-set size, vectorization, branch behavior và cache metric từ profiler.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Cache locality và data-oriented design là gì?
2. Trung bình — Hot loop đọc hoặc ghi hai array nào ở mỗi vòng lặp?
3. Khó — Khi nào array-of-structures có thể nhanh hơn structure-of-arrays dù từng field của cách sau lưu liên tục?
