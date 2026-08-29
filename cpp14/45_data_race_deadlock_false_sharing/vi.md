# Ngày 45 — Data race, deadlock và false sharing

## 1. Vấn đề nó giải quyết

Code đồng thời có thể sai vì truy cập xung đột thiếu đồng bộ, đứng vì vòng chờ lock hoặc chạy chậm do atomic độc lập chung cache line. Đó lần lượt là data race, deadlock và false sharing.

## 2. Kiến thức cần có

- Ngày 7 và 41-44: mutex, atomic, lock ordering, memory ordering, khái niệm cache và join thread.

## 3. Ý tưởng cốt lõi

Tính đúng đi trước: nối mọi shared access với synchronization và đặt quy tắc lấy lock. Sau khi đúng, kiểm tra contention phần cứng và tách dữ liệu độc lập bị ghi thường xuyên khi phép đo chứng minh cần.

## 4. Cú pháp tối thiểu

```cpp
std::lock(first_mutex, second_mutex);
std::lock_guard<std::mutex> first(first_mutex, std::adopt_lock);
struct alignas(64) Counter { std::atomic<int> value{0}; };
```

## 5. Cách nó hoạt động

1. Hai worker lấy cả hai mutex bằng `std::lock` trước khi cập nhật tổng chia sẻ thường.
2. Các counter object được align theo cache line riêng và tăng atomically mà không có truy cập thường xung đột.
3. Chương trình hoàn thành không deadlock hay data race rồi in tổng và counter xác định.

## 6. Lỗi thường gặp

- Thêm atomic cho vài biến không sửa data race trên shared object khác và không tự bảo vệ invariant nhiều object.
- Trước khi áp dụng mẫu, phải kiểm tra mọi truy cập xung đột, global lock order, blocking call khi giữ lock, vị trí cache line, contention và throughput đã đo.

## 7. Khi nào nên dùng

- Nên dùng khi review hoặc thiết kế trạng thái đa thread với yêu cầu rõ về correctness và hiệu năng cache.
- Tránh dùng khi padding và độ phức tạp lock-free được thêm trước khi profiling cho thấy bottleneck thật.

## 8. Ví dụ đơn giản

Mỗi worker tăng an toàn hai tổng dưới cặp lock được lấy chung rồi cập nhật atomic counter align riêng. Thiết kế minh họa phòng tránh mà không cố chạy undefined behavior hay deadlock.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Data race và deadlock là failure về correctness; false sharing là chi phí cache coherence cần đo.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra mọi truy cập xung đột, global lock order, blocking call khi giữ lock, vị trí cache line, contention và throughput đã đo.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Data race, deadlock và false sharing là gì?
2. Trung bình — Vì sao dùng `std::lock` cho cả hai mutex tránh pattern deadlock do lấy ngược thứ tự đơn giản?
3. Khó — Vì sao hai atomic counter độc lập vẫn có thể làm chậm nhau khi nằm trên cùng cache line bị invalidate thường xuyên?
