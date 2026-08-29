# Ngày 49 — Benchmarking, profiling và compiler optimization

## 1. Vấn đề nó giải quyết

Tối ưu theo trực giác thường nhắm cold code hoặc đo noise. Benchmark định lượng workload có kiểm soát, profiling tìm nơi tốn thời gian và hardware event trong chương trình, còn compiler optimization thay generated code theo quy tắc observable behavior.

## 2. Kiến thức cần có

- Ngày 1, 6, 28 và 47-48: compiler flag, chrono, numeric algorithm, locality, allocation và workload cố định.

## 3. Ý tưởng cốt lõi

Trước hết tạo baseline đúng và đại diện. Đo đủ nhiều vòng bằng steady clock, giữ result observable để công việc không bị bỏ, so sánh build cùng điều kiện rồi dùng profiler giải thích số liệu.

## 4. Cú pháp tối thiểu

```cpp
auto start = std::chrono::steady_clock::now();
// repeated measured work
auto elapsed = std::chrono::steady_clock::now() - start;
```

## 5. Cách nó hoạt động

1. Vector cố định được điền một lần, sau đó numeric reduction lặp số lần đã biết.
2. Checksum volatile giữ kết quả cuối observable và steady clock đo interval đơn điệu.
3. Checksum xác định kiểm chứng công việc, còn phép kiểm tra duration không âm vẫn portable giữa tốc độ chạy khác nhau.

## 6. Lỗi thường gặp

- Đo một lời gọi quá nhỏ, trộn setup chỉ vào một variant hoặc so debug với optimized build tạo kết luận sai.
- Trước khi áp dụng mẫu, phải kiểm tra input đại diện, warm-up, ranh giới setup, result observable, clock, số lần lặp, thống kê, compiler flag và bằng chứng profiler.

## 7. Khi nào nên dùng

- Nên dùng khi quyết định hiệu năng có tác động đo được và các phương án có thể test công bằng.
- Tránh dùng khi correctness chưa giải quyết hoặc benchmark quá giả tạo, không đại diện workload thật.

## 8. Ví dụ đơn giản

Chương trình cộng các số 0 tới 999 một nghìn lần. Nó in checksum chính xác và chỉ in thuộc tính Boolean của duration vì nanosecond thay đổi theo máy.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Số benchmark chỉ hỗ trợ quyết định khi workload, build và phương pháp đo được kiểm soát.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra input đại diện, warm-up, ranh giới setup, result observable, clock, số lần lặp, thống kê, compiler flag và bằng chứng profiler.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Benchmarking, profiling và compiler optimization là gì?
2. Trung bình — Vì sao checksum cố định còn elapsed time đo được thì không?
3. Khó — Compiler optimization mạnh có thể xóa cả benchmark loop thế nào khi kết quả tính không có observable use?
