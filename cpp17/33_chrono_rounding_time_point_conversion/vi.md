# Ngày 33 — Chrono rounding, floor, ceil và time-point conversion

## 1. Vấn đề nó giải quyết

Cast duration chỉ truncate về zero, nhưng ứng dụng thường cần floor, ceiling hoặc nearest rõ. C++17 thêm chrono rounding operation có tên để ý định nhìn thấy được.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết duration, period, clock, time point và `duration_cast`.

## 3. Ý tưởng cốt lõi

`std::chrono::floor` chọn target duration lớn nhất không vượt input, `ceil` chọn nhỏ nhất không dưới input, còn `round` chọn gần nhất và tie-to-even. Time point convert qua duration từ epoch.

## 4. Cú pháp tối thiểu

```cpp
auto down = std::chrono::floor<std::chrono::seconds>(1501ms);
auto up = std::chrono::ceil<std::chrono::seconds>(1501ms);
```

## 5. Cách nó hoạt động

1. Duration 1501 millisecond cố định được round theo ba cách thành whole second.
2. Synthetic steady-clock time point dùng cùng epoch duration rồi convert bằng `time_point_cast`.
3. Chương trình in `floor: 1`, `ceil: 2`, `round: 2` và cast count 1, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Negative duration làm lộ khác biệt giữa floor và truncation; không suy ra floor semantics chỉ từ ví dụ dương.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi time value cần align theo boundary rõ cho scheduling, display, bucket hoặc timeout.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Không đọc real clock nên mọi count xác định. Operation có tên ghi rõ rounding policy được chọn.

## 9. Điều cần nhớ

- Lưu time bằng chrono type, đặt tên rounding policy và trì hoãn convert sang raw count tới khi interface yêu cầu.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Chrono rounding, floor, ceil và time-point conversion giải quyết vấn đề chính nào?
2. Trung bình — Floor và truncating cast cho minus 1501 millisecond kết quả gì?
3. Khó — Vì sao convert giữa time point của clock khác nhau có thể invalid về concept?
