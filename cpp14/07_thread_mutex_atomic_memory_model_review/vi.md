# Ngày 7 — Ôn thread, mutex, atomic và C++ memory model

## 1. Vấn đề nó giải quyết

Nhiều thread có thể chạy cùng lúc và chạm vào shared memory. Thư viện thread khởi chạy công việc, mutex bảo vệ thao tác nhiều bước không atomic, atomic cung cấp thao tác không thể bị chia nhỏ, còn memory model định nghĩa lúc nào truy cập tạo data race.

## 2. Kiến thức cần có

- Ngày 1-6; hàm, lambda, scope theo RAII và sự khác nhau giữa shared state với local state.

## 3. Ý tưởng cốt lõi

Các thread xen kẽ theo thứ tự không đoán trước. Mọi shared write phải có cơ chế đồng bộ: hoặc mọi truy cập dùng cùng mutex, hoặc atomic cung cấp ordering phù hợp.

## 4. Cú pháp tối thiểu

```cpp
std::lock_guard<std::mutex> lock(m);
counter.fetch_add(1, std::memory_order_relaxed);
```

## 5. Cách nó hoạt động

1. Hai worker thread nhận input riêng nhưng cùng cập nhật các bộ đếm chia sẻ.
2. Lock guard tuần tự hóa thay đổi trên số nguyên thường, còn phép tăng atomic đếm event hoàn thành một cách an toàn.
3. Join cả hai thread bảo đảm chúng hoàn thành trước khi main đọc và in kết quả cuối.

## 6. Lỗi thường gặp

- Nhiều thread ghi cùng biến thường mà không đồng bộ tạo data race và dẫn tới undefined behavior.
- Trước khi áp dụng mẫu, phải kiểm tra object nào được chia sẻ, thao tác đồng bộ nào bảo vệ từng truy cập và thread được join lúc nào.

## 7. Khi nào nên dùng

- Nên dùng khi công việc độc lập có thể chạy chồng thời gian và shared state có thiết kế đồng bộ rõ, nhỏ.
- Tránh dùng khi công việc quá nhỏ, vốn tuần tự hoặc chi phí và độ phức tạp đồng bộ lớn hơn lợi ích.

## 8. Ví dụ đơn giản

Hai worker cộng giá trị cố định vào tổng được mutex bảo vệ và tăng atomic event count. Thứ tự hoàn thành không quan trọng vì mutex cùng atomic loại bỏ truy cập xung đột thiếu đồng bộ.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Code đồng thời đúng phải nối mọi shared access với quy tắc happens-before hoặc mutual exclusion.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra object nào được chia sẻ, thao tác đồng bộ nào bảo vệ từng truy cập và thread được join lúc nào.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Ôn thread, mutex, atomic và C++ memory model là gì?
2. Trung bình — Vì sao tổng cuối luôn là 30 dù worker nào cũng có thể chạy trước?
3. Khó — Vì sao `memory_order_relaxed` đủ cho event count độc lập ở đây nhưng không tự động đủ để publish dữ liệu khác?
