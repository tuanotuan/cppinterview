# Ngày 41 — std::shared_mutex và std::scoped_lock

## 1. Vấn đề nó giải quyết

Read-heavy state có thể serialize mọi reader sau exclusive mutex không cần thiết, còn acquire nhiều mutex thủ công dễ sai order và deadlock. C++17 chuẩn hóa shared ownership và variadic scoped locking.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết mutex RAII, data race, reader/writer pattern, lock ordering và exception safety.

## 3. Ý tưởng cốt lõi

`std::shared_mutex` cho phép nhiều shared reader hoặc một exclusive writer. `std::shared_lock` sở hữu shared access, còn `std::scoped_lock` acquire nhiều mutex bằng deadlock-avoidance algorithm và release theo RAII.

## 4. Cú pháp tối thiểu

```cpp
std::shared_lock read{mutex};
std::unique_lock write{mutex};
std::scoped_lock both{left_mutex, right_mutex};
```

## 5. Cách nó hoạt động

1. Score được bảo vệ được write dưới exclusive ownership và read dưới shared ownership.
2. Transfer sau đó acquire hai account mutex trong một scoped lock trước khi đổi cả hai balance một cách atomic đối với locked access khác.
3. Chương trình in `score: 91` và balance cuối `70, 80`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Shared mutex không làm referenced data an toàn sau khi lock release, và manual acquisition trộn lẫn có thể đưa deadlock trở lại.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi measurement cho thấy read concurrency quan trọng hoặc một invariant trải trên nhiều object được bảo vệ riêng.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Operation chạy xác định, tập trung vào ownership mode và multi-lock RAII thay vì output phụ thuộc timing.

## 9. Điều cần nhớ

- Chọn lock granularity từ invariant và giữ mọi reference tới protected state trong owning lock scope.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::shared_mutex và std::scoped_lock giải quyết vấn đề chính nào?
2. Trung bình — Vì sao cả hai account mutex phải được giữ suốt transfer?
3. Khó — Khi nào reader-writer mutex có thể kém hơn ordinary mutex?
