# Ngày 8 — Structured bindings

## 1. Vấn đề nó giải quyết

Truy cập kết quả tuple-like bằng nhiều lời gọi `std::get` làm mờ ý nghĩa từng thành phần. Structured binding tạo tên cục bộ cho phần tử array, tuple-like hoặc aggregate phù hợp.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết array, aggregate, `std::pair`, reference và binding theo value so với reference.

## 3. Ý tưởng cốt lõi

`auto [name, score] = record` tạo binding cho các phần tử được phân rã. Thêm `&` hoặc `const &` khi tên phải alias thay vì copy object.

## 4. Cú pháp tối thiểu

```cpp
std::pair<std::string, int> result{"Ada", 91};
auto& [name, score] = result;
score += 4;
```

## 5. Cách nó hoạt động

1. Một pair được phân rã thành hai reference binding có tên dễ hiểu.
2. Cập nhật score thay đổi phần tử thứ hai của pair gốc vì `auto&` yêu cầu alias.
3. Chương trình in `Ada: 95` và xác nhận pair gốc lưu 95, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- `auto` thường copy object được phân rã; thay đổi chỉ tác động hidden copy của binding chứ không phải source.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi kết quả có shape cố định và các thành phần cần tên cục bộ rõ nghĩa.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Code bind pair bằng reference, tăng một component rồi in qua cả binding lẫn object gốc để chứng minh aliasing.

## 9. Điều cần nhớ

- Structured binding cải thiện cách đặt tên, nhưng qualifier copy/reference quyết định lifetime và mutation.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Structured bindings giải quyết vấn đề chính nào?
2. Trung bình — Điều gì đổi nếu `auto& [name, score]` thành `auto [name, score]`?
3. Khó — Hidden binding object và từng name liên hệ thế nào trong tuple-like decomposition?
