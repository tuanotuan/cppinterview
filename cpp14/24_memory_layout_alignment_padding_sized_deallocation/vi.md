# Ngày 24 — Memory layout, alignment, padding và sized deallocation

## 1. Vấn đề nó giải quyết

Member của object phải nằm ở địa chỉ phù hợp alignment của kiểu nên compiler có thể chèn padding và làm tròn kích thước cho array. C++14 cũng chuẩn hóa sized deallocation, cho phép hàm delete nhận kích thước object được giải phóng.

## 2. Kiến thức cần có

- Ngày 18, 21 và 23: object lifetime, allocation, deletion, `sizeof` và cleanup không throw.

## 3. Ý tưởng cốt lõi

Layout là chuỗi vị trí member đã căn chỉnh, không phải ghép sát byte. `alignof`, `sizeof` và `offsetof` cho thấy quyết định của implementation với standard-layout type.

## 4. Cú pháp tối thiểu

```cpp
struct Layout { char tag; int value; short code; };
static void operator delete(void* p, std::size_t size) noexcept;
```

## 5. Cách nó hoạt động

1. Compiler gán offset đã alignment cho từng member và có thể chèn byte không dùng giữa hoặc sau chúng.
2. Delete node mẫu chọn hàm sized deallocation riêng của class và truyền kích thước allocation.
3. Chương trình in thông tin layout phụ thuộc implementation và xác nhận kích thước được truyền vào deallocation.

## 6. Lỗi thường gặp

- Cho rằng offset member hoặc tổng kích thước luôn portable giữa compiler và kiến trúc có thể phá binary format và giao thức mạng.
- Trước khi áp dụng mẫu, phải kiểm tra yêu cầu standard-layout, alignment, padding, ABI, cặp allocation/deallocation và byte order khi serialize.

## 7. Khi nào nên dùng

- Nên dùng khi làm việc với phần cứng, ABI, allocator hoặc dữ liệu nhạy hiệu năng cần đo layout thật.
- Tránh dùng khi raw object layout bị dùng như định dạng serialization portable.

## 8. Ví dụ đơn giản

Một standard-layout struct cho thấy offset member và alignment. Class nhỏ chỉ định nghĩa sized `operator delete` nên lúc delete sẽ báo kích thước implementation truyền vào.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Layout là thuộc tính ABI cần đo, còn biểu diễn serialize phải được thiết kế rõ ràng.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra yêu cầu standard-layout, alignment, padding, ABI, cặp allocation/deallocation và byte order khi serialize.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Memory layout, alignment, padding và sized deallocation là gì?
2. Trung bình — Vì sao offset của `value` thường lớn hơn một dù `tag` chỉ chiếm một byte?
3. Khó — Vì sao hàm allocation và deallocation vẫn phải là cặp tương thích dù deallocator nhận thêm kích thước?
