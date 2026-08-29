# Ngày 43 — Mutex, condition variable và producer–consumer design

## 1. Vấn đề nó giải quyết

Consumer nên sleep khi queue rỗng thay vì spin, nhưng wakeup không được làm mất state change hay race với shutdown. Condition variable điều phối wait quanh predicate được mutex bảo vệ.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết mutex ownership, RAII lock, queue, thread, predicate và spurious wakeup.

## 3. Ý tưởng cốt lõi

Mutex bảo vệ cả queue lẫn completion flag. Consumer wait với predicate tương đương `!queue.empty() || done`; wait atomically release mutex khi ngủ rồi reacquire trước khi return.

## 4. Cú pháp tối thiểu

```cpp
condition.wait(lock, [&] { return !queue.empty() || done; });
```

## 5. Cách nó hoạt động

1. Producer push ba job cố định khi giữ lock và notify sau mỗi state change.
2. Consumer loop theo predicate, lấy work dưới mutex và chỉ exit khi queue rỗng đồng thời completion true.
3. Chương trình in `processed sum: 60`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Wait không predicate dễ sai do spurious wakeup hoặc missed condition, còn đọc completion flag ngoài synchronization tạo race.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi thread trao đổi work qua shared state và blocking phù hợp hơn spinning.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Một producer và một consumer dùng một queue cùng shutdown flag rõ. Chỉ final sum xác định được in.

## 9. Điều cần nhớ

- Condition variable wait cho predicate chứ không phải notification; predicate và mọi field nó đọc cần cùng synchronization discipline.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mutex, condition variable và producer–consumer design giải quyết vấn đề chính nào?
2. Trung bình — Vì sao consumer phải test cả queue state lẫn completion?
3. Khó — Vì sao đổi predicate state trước notification là ordering pattern quan trọng?
