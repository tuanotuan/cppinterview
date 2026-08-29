# Ngày 6 — Ôn thread, atomic và C++ memory model

## 1. Vấn đề nó giải quyết

Hai thread truy cập shared state mà không có ordering có thể tạo data race và undefined behavior. Atomic cung cấp thao tác không chia cắt cùng quan hệ memory order để publish dữ liệu thường an toàn.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Hiểu tạo và join thread, shared object cùng khác biệt giữa atomicity và mutual exclusion.

## 3. Ý tưởng cốt lõi

Release store đồng bộ với acquire load quan sát được nó. Write đứng trước release trở nên visible sau acquire tương ứng, tạo cạnh `happens-before` dù payload không atomic.

## 4. Cú pháp tối thiểu

```cpp
payload = 42;
ready.store(true, std::memory_order_release);
while (!ready.load(std::memory_order_acquire)) {}
use(payload);
```

## 5. Cách nó hoạt động

1. Producer ghi integer không atomic rồi publish ready bằng release store.
2. Consumer spin bằng acquire load; sau khi thấy true, nó đọc được payload vì synchronization đã order các truy cập.
3. Chương trình in `payload: 42` sau khi cả hai thread được join, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Đổi một phía thành relaxed mà không có đồng bộ khác có thể làm mất bảo đảm visibility dù truy cập flag vẫn atomic.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi protocol publish một chiều nhỏ có synchronization edge được chứng minh rõ.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Một producer publish payload cố định cho một consumer. Work queue thật còn cần blocking, backoff, ownership và shutdown.

## 9. Điều cần nhớ

- Atomic chỉ ngăn race khi mọi shared access tham gia protocol đúng; memory ordering là một phần của protocol.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Ôn thread, atomic và C++ memory model giải quyết vấn đề chính nào?
2. Trung bình — Write nào trở nên visible sau khi acquire load quan sát release store?
3. Khó — Quan hệ synchronizes-with và happens-before nào khiến payload không atomic vẫn race-free?
