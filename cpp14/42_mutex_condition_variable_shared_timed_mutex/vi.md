# Ngày 42 — Mutex, condition variable và std::shared_timed_mutex

## 1. Vấn đề nó giải quyết

Thread cần bảo vệ shared state mà không đốt CPU lúc chờ, còn dữ liệu nhiều lượt đọc có thể cho nhiều reader cùng lúc. Mutex bảo vệ predicate, `condition_variable` block tới khi có notify và `shared_timed_mutex` tách writer độc quyền khỏi reader chia sẻ.

## 2. Kiến thức cần có

- Ngày 7 và 41: thread, mutex ownership, happens-before, predicate, waiting và joining.

## 3. Ý tưởng cốt lõi

Condition variable không phải điều kiện; predicate được mutex bảo vệ mới là điều kiện. Luôn wait bằng loop hoặc predicate overload vì có spurious wakeup, rồi lấy read lock hay write lock phù hợp cho dữ liệu.

## 4. Cú pháp tối thiểu

```cpp
cv.wait(lock, [&] { return ready; });
std::unique_lock<std::shared_timed_mutex> write(data_mutex);
std::shared_lock<std::shared_timed_mutex> read(data_mutex);
```

## 5. Cách nó hoạt động

1. Producer lấy exclusive data lock, ghi 42 rồi đặt readiness predicate dưới mutex thường.
2. Notification đánh thức waiter; predicate được kiểm tra lại xác nhận ready trước khi nó lấy shared read lock.
3. Reader quan sát value đã publish an toàn và thread được join rõ.

## 6. Lỗi thường gặp

- Wait mà không có predicate được bảo vệ có thể mất notification hoặc xem spurious wakeup là công việc thật.
- Trước khi áp dụng mẫu, phải kiểm tra mutex của predicate, thời điểm notify, lock ordering, ownership reader/writer, timeout behavior và thread completion.

## 7. Khi nào nên dùng

- Nên dùng khi thread phải ngủ chờ trạng thái đổi hoặc workload nhiều read hưởng lợi từ shared lock.
- Tránh dùng khi state có thể chuyển bằng message hoặc future đơn giản hơn, hoặc phép đo contention không cho thấy lợi ích.

## 8. Ví dụ đơn giản

Một producer publish số nguyên cố định. Main chờ Boolean predicate mà không spin, sau đó lấy shared lock để đọc value được bảo vệ.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Condition variable phối hợp chuyển trạng thái; mutex vẫn bảo vệ predicate và dữ liệu.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra mutex của predicate, thời điểm notify, lock ordering, ownership reader/writer, timeout behavior và thread completion.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Mutex, condition variable và std::shared_timed_mutex là gì?
2. Trung bình — Vì sao predicate overload của `wait` vẫn đúng sau spurious wakeup?
3. Khó — Rủi ro deadlock nào xuất hiện nếu các thread lấy readiness mutex và data mutex theo thứ tự không nhất quán?
