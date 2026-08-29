# Ngày 44 — C++ memory model và memory ordering

## 1. Vấn đề nó giải quyết

Atomicity riêng lẻ không xác định lúc nào ghi trên vùng nhớ khác trở nên nhìn thấy. C++ memory model định nghĩa quan hệ ordering, còn release/acquire có thể publish dữ liệu thường an toàn từ thread này sang thread khác.

## 2. Kiến thức cần có

- Ngày 7 và 41-43: thread, atomic, CAS, sequencing, happens-before và shared non-atomic data.

## 3. Ý tưởng cốt lõi

Producer ghi dữ liệu rồi release store vào flag. Consumer đọc đúng value đó bằng acquire sẽ tạo cạnh synchronizes-with, khiến write trước đó của producer happen-before read sau đó của consumer.

## 4. Cú pháp tối thiểu

```cpp
data = 42;
ready.store(true, std::memory_order_release);

while (!ready.load(std::memory_order_acquire)) { }
use(data);
```

## 5. Cách nó hoạt động

1. Producer ghi số nguyên thường trước khi publish true vào atomic readiness flag.
2. Consumer lặp acquire load tới khi quan sát value được release store ghi.
3. Cặp release/acquire order truy cập dữ liệu thường nên consumer in 42 an toàn.

## 6. Lỗi thường gặp

- Thay cả hai thao tác bằng relaxed nhưng vẫn dùng flag để publish dữ liệu thường sẽ bỏ mất synchronization cần thiết.
- Trước khi áp dụng mẫu, phải kiểm tra atomic value nào được quan sát, release sequence, acquire operation, dữ liệu non-atomic được bảo vệ và việc ordering yếu hơn đã được chứng minh chưa.

## 7. Khi nào nên dùng

- Nên dùng khi quan hệ message-passing được tài liệu hóa cần atomic ordering mức thấp và invariant đủ nhỏ để chứng minh.
- Tránh dùng khi mutex, future, queue hoặc condition variable diễn đạt synchronization an toàn hơn.

## 8. Ví dụ đơn giản

Một producer publish số nguyên cố định qua release flag. Một consumer acquire flag đó trước khi đọc, rồi main join cả hai worker.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Memory order nói về visibility và ordering giữa các thao tác, không chỉ giá trị atomic không thể chia.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra atomic value nào được quan sát, release sequence, acquire operation, dữ liệu non-atomic được bảo vệ và việc ordering yếu hơn đã được chứng minh chưa.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của C++ memory model và memory ordering là gì?
2. Trung bình — Thao tác nào làm write trước đó của producer lên `data` trở nên visible với consumer trong pattern này?
3. Khó — Vì sao acquire load phải quan sát published value của release sequence thì quan hệ synchronizes-with mới áp dụng?
