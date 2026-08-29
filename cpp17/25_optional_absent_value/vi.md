# Ngày 25 — std::optional và biểu diễn giá trị có thể vắng mặt

## 1. Vấn đề nó giải quyết

Sentinel như minus one làm quá tải value domain và caller dễ quên kiểm tra. `std::optional<T>` biểu diễn rõ hoặc có live `T` hoặc không có value.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết value semantics, object lifetime, Boolean test, return-by-value và exception từ checked access.

## 3. Ý tưởng cốt lõi

Optional sở hữu in-place storage cho `T` cùng engagement state. Nó không tự allocate chỉ vì là optional; construct, reset hoặc assign thay lifetime của contained object.

## 4. Cú pháp tối thiểu

```cpp
std::optional<int> find_score(std::string_view name);
if (const auto score = find_score("Ada")) {
    use(*score);
}
```

## 5. Cách nó hoạt động

1. Lookup function trả engaged optional cho một tên cố định và `std::nullopt` cho trường hợp khác.
2. Caller test engagement trước dereference và dùng `value_or` khi fallback rõ ràng là phù hợp.
3. Chương trình in `Ada: 91` và `Unknown: 0`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Dereference optional không engaged là invalid, còn `value()` throw; phải chọn và ghi rõ policy xử lý vắng mặt.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi absence là trường hợp bình thường, khác mọi valid value và không cần polymorphic ownership.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Hai lookup thể hiện engaged path và empty path. Không sentinel nào có thể bị nhầm với score hợp lệ.

## 9. Điều cần nhớ

- Optional đưa absence vào type, nhưng tài liệu API vẫn phải giải thích vì sao value có thể vắng.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — std::optional và biểu diễn giá trị có thể vắng mặt giải quyết vấn đề chính nào?
2. Trung bình — Tạo `optional<int>` rỗng có construct object `int` không?
3. Khó — Khi nào error result nên mang diagnostic thay vì chỉ biểu diễn bằng optional absence?
