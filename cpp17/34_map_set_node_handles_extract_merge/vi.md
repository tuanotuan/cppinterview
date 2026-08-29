# Ngày 34 — Map/set node handles, extract và merge

## 1. Vấn đề nó giải quyết

Chuyển element giữa associative container hoặc đổi map key trước đây cần allocation và reconstruction vì key là const qua iterator. C++17 cung cấp detached node bằng handle có ownership.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Biết ordered associative container, unique key, allocator, iterator invalidation và move semantics.

## 3. Ý tưởng cốt lõi

`extract` gỡ node mà không hủy key và value. Node handle không rỗng sở hữu node, cho phép đổi key và insert vào container tương thích; `merge` chỉ chuyển node có key được nhận.

## 4. Cú pháp tối thiểu

```cpp
auto node = source.extract(2);
node.key() = 20;
destination.insert(std::move(node));
destination.merge(source);
```

## 5. Cách nó hoạt động

1. Một map node được extract, key đổi từ 2 thành 20 rồi insert vào map khác.
2. Merge sau đó chuyển source node còn lại không conflict trong khi giữ node-owned value.
3. Chương trình in `destination: 1=one 3=three 20=two` và source rỗng, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Insertion có thể fail do duplicate key; insertion result trả về vẫn có thể sở hữu node và không được bỏ qua.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi associative node cần chuyển hoặc key cần đổi mà tránh reconstruct value.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Mọi container dùng default allocator tương thích. Iteration sau đó cho sorted key order và xác nhận source node nào đã chuyển.

## 9. Điều cần nhớ

- Node handle làm temporary node ownership rõ; luôn kiểm tra insertion và duplicate-key outcome.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Map/set node handles, extract và merge giải quyết vấn đề chính nào?
2. Trung bình — Key nào còn trong source sau merge thành công?
3. Khó — Allocator compatibility và duplicate key ảnh hưởng node transfer thế nào?
