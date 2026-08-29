# Ngày 43 — Atomic operations và compare-and-swap

## 1. Vấn đề nó giải quyết

Chuỗi đọc-kiểm tra-ghi trên shared data có thể bị thread khác xen vào. Atomic compare-and-swap thực hiện chuyển trạng thái có điều kiện như một thao tác atomic: chỉ cập nhật nếu value hiện tại bằng expected.

## 2. Kiến thức cần có

- Ngày 7 và 41-42: atomic, thread, shared state, tên memory ordering và synchronization.

## 3. Ý tưởng cốt lõi

CAS hỏi trạng thái còn giống điều tôi đã quan sát không. Nếu thành công nó ghi desired value; nếu thất bại atomic không đổi và `expected` được cập nhật bằng value thật đã thấy.

## 4. Cú pháp tối thiểu

```cpp
int expected = 0;
bool changed = state.compare_exchange_strong(expected, 1);
```

## 5. Cách nó hoạt động

1. Strong CAS đầu so atomic state bằng không với expected bằng không và yêu cầu state một.
2. Nó thành công atomically; lần thử thứ hai mong zero thất bại vì state hiện đã là một.
3. Ví dụ in lần thành công, state cuối là một, lần hai thất bại và expected sau failure được cập nhật thành một.

## 6. Lỗi thường gặp

- Bỏ qua việc failure sửa `expected` có thể phá retry loop hoặc làm so sánh với giả định cũ.
- Trước khi áp dụng mẫu, phải kiểm tra transition mong muốn, cập nhật expected, lựa chọn weak/strong, retry loop, memory order và yêu cầu progress.

## 7. Khi nào nên dùng

- Nên dùng khi chuyển trạng thái shared nhỏ phải có điều kiện và thiết kế lock-free có lý do rõ.
- Tránh dùng khi invariant trải qua nhiều object độc lập hoặc mutex đơn giản, dễ kiểm chứng hơn.

## 8. Ví dụ đơn giản

Atomic state chuyển từ idle zero sang running one. Lặp lại transition mong đợi đó cho thấy failure path và argument `expected` đã đổi.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- CAS ghép comparison với update một cách atomic, trong đó expected là argument vừa vào vừa ra.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra transition mong muốn, cập nhật expected, lựa chọn weak/strong, retry loop, memory order và yêu cầu progress.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Atomic operations và compare-and-swap là gì?
2. Trung bình — `state` và `expected` giữ giá trị gì sau khi CAS thứ hai thất bại?
3. Khó — Vì sao `compare_exchange_weak` thường nằm trong retry loop dù observed value có vẻ bằng nhau?
