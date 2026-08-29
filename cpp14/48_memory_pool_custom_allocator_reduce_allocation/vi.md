# Ngày 48 — Memory pool, custom allocator và giảm allocation

## 1. Vấn đề nó giải quyết

General-purpose allocation thường xuyên có thể tăng latency, metadata overhead, fragmentation và locality kém. Memory pool reserve storage thành block lớn và custom allocation interface dựng object trong slot tái sử dụng.

## 2. Kiến thức cần có

- Ngày 21, 24-25 và 47: lifetime, alignment, placement new, container, locality và chi phí allocation đã đo.

## 3. Ý tưởng cốt lõi

Hãy tách raw storage khỏi object lifetime. Lấy slot chưa tạo `T` cho tới khi placement construction chạy, và release object phải gọi destructor trước khi đánh dấu slot có thể tái sử dụng.

## 4. Cú pháp tối thiểu

```cpp
void* slot = &storage[index];
T* object = new (slot) T(value);
object->~T();
```

## 5. Cách nó hoạt động

1. Fixed pool chứa các raw slot đã align và một used-state array song song.
2. Create tìm slot rảnh và bắt đầu object lifetime bằng placement new; destroy kết thúc lifetime rồi trả lại slot.
3. Hai số nguyên được dựng và in mà không heap allocation riêng từng object, sau đó cả hai slot được release rõ.

## 6. Lỗi thường gặp

- Tái sử dụng storage trước khi hủy live object, align sai slot hoặc để pointer sống lâu hơn pool gây undefined behavior.
- Trước khi áp dụng mẫu, phải kiểm tra alignment, ownership slot, cặp construction/destruction, policy hết slot, rollback khi exception, thread safety và lợi ích đã đo.

## 7. Khi nào nên dùng

- Nên dùng khi nhiều object cùng dạng có lifetime hữu hạn và profiling xác định allocation là bottleneck.
- Tránh dùng khi value chuẩn, `reserve` hoặc allocator đã được kiểm chứng giải quyết vấn đề với rủi ro thấp hơn.

## 8. Ví dụ đơn giản

Pool hai slot dựng hai số nguyên trong `std::aligned_storage`. Pool theo dõi slot đang live và gọi destructor trước khi tái sử dụng.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Pool tối ưu allocation policy nhưng đẩy trách nhiệm đúng về raw storage và object lifetime cho người viết.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra alignment, ownership slot, cặp construction/destruction, policy hết slot, rollback khi exception, thread safety và lợi ích đã đo.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Memory pool, custom allocator và giảm allocation là gì?
2. Trung bình — Điều gì phải xảy ra với object trước khi slot trong pool có thể đánh dấu free an toàn?
3. Khó — Pool create phải rollback trạng thái slot thế nào nếu constructor throw sau khi đã chọn slot?
