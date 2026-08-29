# Ngày 5 — Ôn STL containers, iterators, algorithms và callables

## 1. Vấn đề nó giải quyết

Loop viết tay thường trộn storage, traversal, selection và transformation. STL tách trách nhiệm: container sở hữu value, iterator giới hạn range, algorithm thực hiện thao tác và callable tùy biến policy.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết `std::vector`, half-open range, cú pháp lambda và invalidation iterator cơ bản.

## 3. Ý tưởng cốt lõi

Algorithm nhận `[first, last)` và không sở hữu sequence. Function object, function pointer hay lambda cung cấp behavior như predicate hoặc transformation mà không gắn policy vào container.

## 4. Cú pháp tối thiểu

```cpp
std::transform(values.begin(), values.end(),
               values.begin(), [](int x) { return x * x; });
```

## 5. Cách nó hoạt động

1. Vector lưu integer cố định; `remove_if` chuyển phần tử không muốn ra sau logical end, rồi `erase` xóa vật lý.
2. `std::transform` gọi lambda cho mỗi phần tử còn lại rồi ghi bình phương qua output iterator.
3. Chương trình in `squares: 4 16 36`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Chỉ gọi `remove_if` không làm container nhỏ lại; logical end trả về phải được truyền cho `erase`.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi thao tác có thể biểu diễn bằng standard range algorithm cùng policy nhỏ và rõ.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Erase-remove idiom giữ số chẵn, sau đó transformation tại chỗ bình phương chúng. Range-for chỉ hiển thị container cuối.

## 9. Điều cần nhớ

- Ưu tiên standard algorithm vì hợp đồng range và callable giúp ý định dễ review, đồng thời giảm bookkeeping.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Ôn STL containers, iterators, algorithms và callables giải quyết vấn đề chính nào?
2. Trung bình — Phần nào của vector được quy định ngay sau `remove_if` nhưng trước `erase`?
3. Khó — Quy tắc invalidation iterator nào của vector quan trọng khi erase?
