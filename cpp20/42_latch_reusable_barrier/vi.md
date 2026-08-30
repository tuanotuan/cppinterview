# Ngày 42 — Latch và reusable barrier

## 1. Vấn đề nó giải quyết

Latch chờ countdown một lần, còn barrier nhiều lần tập hợp nhóm cố định ở boundary từng phase và có thể chạy completion step. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Thread, phase, atomic và blocking synchronization.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Latch là cổng đích dùng một lần. Barrier là cổng quay: mọi người đến, phase hoàn tất rồi cổng reset cho vòng tiếp. Hãy đọc `std::barrier` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::latch done{2};
std::barrier phase{2};
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::barrier`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Hủy synchronization object khi thread còn dùng là không hợp lệ; thiếu một arrival dự kiến có thể deadlock cả phase.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi worker có completion point một lần rõ ràng hoặc lặp nhiều phase đồng bộ.
- Tránh dùng khi participant có thể biến mất bất ngờ mà không drop đúng khỏi barrier.

## 8. Ví dụ đơn giản

Hai jthread count down latch, sau đó hai thread khác qua barrier hai lần và completion counter ghi số phase. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::barrier` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::barrier` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao latch không thể đơn giản reset và tái sử dụng sau khi count về 0?
3. Khó — Deadlock cụ thể nào xảy ra nếu barrier chờ hai arrival nhưng một participant thoát trước `arrive_and_wait`?
