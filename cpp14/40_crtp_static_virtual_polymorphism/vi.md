# Ngày 40 — CRTP, static polymorphism và virtual polymorphism

## 1. Vấn đề nó giải quyết

Nhiều kiểu có thể dùng chung interface qua binding compile-time hoặc dispatch runtime. CRTP truyền derived type vào base template để static polymorphism, còn virtual function chọn override qua base reference hoặc pointer lúc runtime.

## 2. Kiến thức cần có

- Ngày 21, 34 và 39: inheritance, template, object lifetime, callable và virtual function.

## 3. Ý tưởng cốt lõi

CRTP biết concrete derived type lúc biên dịch và dùng `static_cast` để gọi. Virtual polymorphism giữ thông tin kiểu runtime sau base interface ổn định và thường dispatch qua vtable.

## 4. Cú pháp tối thiểu

```cpp
template<class Derived>
struct StaticBase { void run() { static_cast<Derived*>(this)->impl(); } };

struct VirtualBase { virtual void run() const = 0; };
```

## 5. Cách nó hoạt động

1. CRTP base chuyển lời gọi tới derived implementation đã biết ở compile-time.
2. Một virtual base riêng gọi override qua base reference có concrete object chỉ biết ở runtime.
3. Cả hai cách đều in nhãn implementation nhưng khác trade-off về binding và storage.

## 6. Lỗi thường gặp

- Dùng CRTP như thể nó cho phép một collection runtime nhiều kiểu là nhầm static polymorphism với erased base chung.
- Trước khi áp dụng mẫu, phải kiểm tra thời điểm binding, nhu cầu lưu nhiều kiểu, tăng code size, virtual destructor, ownership và phép đo hiệu năng.

## 7. Khi nào nên dùng

- Nên dùng khi CRTP phù hợp customization compile-time; virtual dispatch phù hợp thay thế runtime qua một interface ổn định.
- Tránh dùng khi một trong hai pattern thêm inheritance ở nơi composition hoặc template parameter đơn giản rõ hơn.

## 8. Ví dụ đơn giản

Static worker được gọi qua CRTP base, còn dynamic worker được gọi qua virtual base reference. Output trông giống nhau nhưng cơ chế dispatch khác.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Static và virtual polymorphism giải quyết bài toán thời điểm binding và storage khác nhau.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra thời điểm binding, nhu cầu lưu nhiều kiểu, tăng code size, virtual destructor, ownership và phép đo hiệu năng.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của CRTP, static polymorphism và virtual polymorphism là gì?
2. Trung bình — Lời gọi nào trong ví dụ có thể được compiler bind trực tiếp tới concrete implementation?
3. Khó — Vì sao delete derived object qua polymorphic base pointer cần base destructor virtual?
