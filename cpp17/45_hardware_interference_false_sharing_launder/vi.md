# Ngày 45 — Hardware interference size, false sharing và std::launder

## 1. Vấn đề nó giải quyết

Các atomic độc lập nằm cùng cache line có thể invalidate cache của nhau, còn reuse storage cho object mới có thể để old pointer nằm ngoài lifetime model. C++17 cung cấp vocabulary cho cả hai boundary.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết cache coherence, alignment, object lifetime, placement new, explicit destruction và undefined behavior.

## 3. Ý tưởng cốt lõi

`hardware_destructive_interference_size` ước lượng spacing tránh destructive sharing, còn constructive value ước lượng data hưởng lợi khi gần nhau. `std::launder` lấy pointer dùng cho object mới trong trường hợp old pointer không tự retarget hợp lệ.

## 4. Cú pháp tối thiểu

```cpp
alignas(std::hardware_destructive_interference_size)
std::atomic<int> counter;
T* current = std::launder(old_pointer);
```

## 5. Cách nó hoạt động

1. Program kiểm tra standard interference-size hint dương mà không in byte count phụ thuộc implementation.
2. Raw storage đã align chứa object có const member, kết thúc lifetime, chứa replacement rồi lấy pointer bằng `std::launder`.
3. Chương trình in `interference hints: 1` và `replacement: 2`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Interference size là implementation hint chứ không phải cache-line constant universal, còn launder không sửa misalignment, thiếu construction hay object type không liên quan.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi profiling xác nhận false sharing hoặc advanced storage reuse theo lifetime design đã review chính thức.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Ví dụ lifetime tuân đúng placement construction và explicit destruction. Application code thường nên ưu tiên RAII container.

## 9. Điều cần nhớ

- Hardware layout hint cần measurement, còn storage reuse cần lifetime correctness chính xác ở language level.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Hardware interference size, false sharing và std::launder giải quyết vấn đề chính nào?
2. Trung bình — Vì sao interference-size output là Boolean thay vì byte count?
3. Khó — Transparent-replacement restriction nào làm `std::launder` liên quan với object có const member?
