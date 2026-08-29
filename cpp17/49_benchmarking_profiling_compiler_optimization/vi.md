# Ngày 49 — Benchmarking, profiling và compiler optimization

## 1. Vấn đề nó giải quyết

Tối ưu theo trực giác thường nhắm cold code hoặc đo cả setup lẫn noise. Benchmark định lượng workload có kiểm soát, profiler tìm cost thật và optimized build cho thấy compiler có thể transform hợp lệ gì.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết steady clock, optimization flag, observable behavior, repeated measurement, statistics và representative input.

## 3. Ý tưởng cốt lõi

Bắt đầu từ baseline đúng và đại diện. Tách setup, lặp đủ work, giữ observable result để optimization không xóa, so cùng điều kiện và dùng profiler giải thích timing difference thay vì đoán.

## 4. Cú pháp tối thiểu

```cpp
const auto start = std::chrono::steady_clock::now();
// repeated measured work
const auto elapsed = std::chrono::steady_clock::now() - start;
```

## 5. Cách nó hoạt động

1. Vector được chuẩn bị trước timing, rồi cùng integer accumulation chạy một nghìn lần.
2. Volatile checksum giữ mọi accumulated result observable, còn steady clock cung cấp monotonic interval.
3. Chương trình in `checksum: 499500000` và property duration không âm là true, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Một timing, so debug với release, setup không đều, thermal change và synthetic data đều có thể tạo kết luận thuyết phục nhưng sai.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi quyết định hiệu năng cụ thể quan trọng và implementation cạnh tranh có thể đo trong điều kiện thực.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Elapsed nanosecond cố ý không in vì máy khác nhau; invariant checksum và duration validity là test output ổn định.

## 9. Điều cần nhớ

- Benchmark number chỉ thành bằng chứng khi workload, build, environment, statistic được kiểm soát và profiler xác nhận.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Benchmarking, profiling và compiler optimization giải quyết vấn đề chính nào?
2. Trung bình — Vì sao checksum xác định còn elapsed time thì không?
3. Khó — Dead-code elimination có thể làm benchmark invalid thế nào khi result không bao giờ observable?
