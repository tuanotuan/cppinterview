# Ngày 39 — Parallel algorithms và execution policies

## 1. Vấn đề nó giải quyết

Data-parallel loop khó schedule portable bằng tay. C++17 thêm overload nhận execution policy để standard algorithm chọn sequential, parallel hoặc parallel-unsequenced execution.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết standard algorithm, thread, data race, associativity, iterator category và đo hiệu năng.

## 3. Ý tưởng cốt lõi

`std::execution::seq` yêu cầu sequencing, `par` cho phép nhiều thread, còn `par_unseq` thêm unsequenced vector-style execution. User operation phải thỏa yêu cầu chặt về independence, exception và synchronization.

## 4. Cú pháp tối thiểu

```cpp
std::for_each(std::execution::par,
              values.begin(), values.end(),
              [](int& value) { value *= 2; });
```

## 5. Cách nó hoạt động

1. Algorithm dùng parallel policy nhân đôi các vector element độc lập mà không share state giữa iteration.
2. Parallel reduction tính integer sum; associative exact arithmetic làm regrouping vô hại trong range này.
3. Chương trình in `first: 0`, `last: 1998` và `sum: 999000`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Capture rồi mutate shared state tạo race; exception dưới standard parallel policy có thể terminate program, còn workload nhỏ có thể chậm hơn.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi iteration độc lập, operation chịu được regrouping, data đủ lớn và benchmark chứng minh lợi ích.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Mỗi invocation chỉ chạm element được giao. Final sum dùng bounded integer nên output xác định bất kể scheduling.

## 9. Điều cần nhớ

- Execution policy đổi cả callable contract lẫn scheduling; phải chứng minh safety trước khi đo speed.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Parallel algorithms và execution policies giải quyết vấn đề chính nào?
2. Trung bình — Vì sao mutate từng referenced vector element là race-free trong lời gọi này?
3. Khó — Operation nào bị cấm hoặc nguy hiểm trong callable của `par_unseq`?
