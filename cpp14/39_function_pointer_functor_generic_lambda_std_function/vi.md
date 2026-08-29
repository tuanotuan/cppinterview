# Ngày 39 — Function pointer, functor, generic lambda và std::function

## 1. Vấn đề nó giải quyết

C++ biểu diễn callable bằng nhiều dạng khác nhau về state, genericity và chi phí lưu trữ. Function pointer trỏ free function, functor mang state có kiểu, generic lambda cho lời gọi template ngắn, còn `std::function` type-erase callable tương thích sau một signature.

## 2. Kiến thức cần có

- Ngày 4, 9, 27 và 34: function, object, call operator, lambda, template và cơ bản về type erasure.

## 3. Ý tưởng cốt lõi

Hãy tách concrete type của callable khỏi call signature. Giữ concrete type khi tối ưu compile-time và state quan trọng; chỉ type erasure khi nhiều callable khác kiểu phải cùng nằm trong một runtime slot.

## 4. Cú pháp tối thiểu

```cpp
int (*pointer)(int, int) = add;
Multiplier functor{3};
auto lambda = [](auto a, auto b) { return a - b; };
std::function<int(int, int)> operation = pointer;
```

## 5. Cách nó hoạt động

1. Ba callable form cụ thể cài addition, multiplication có state và generic subtraction.
2. `std::function<int(int, int)>` lần lượt lưu từng callable tương thích sau cùng runtime call interface.
3. Lời gọi qua pointer, functor, lambda và wrapper type-erased in các kết quả xác định khác nhau.

## 6. Lỗi thường gặp

- `std::function` có thể allocation và thêm indirection; ở C++14 nó còn cần target copyable nên move-only closure không đưa trực tiếp vào được.
- Trước khi áp dụng mẫu, phải kiểm tra nhu cầu state, genericity, copyability, lifetime, target signature, allocation và call overhead.

## 7. Khi nào nên dùng

- Nên dùng khi callable form nhẹ nhất đáp ứng thiết kế, hoặc runtime storage thật sự cần một signature đã erase.
- Tránh dùng khi type erasure được thêm ở nơi template parameter hoặc concrete lambda type đơn giản và nhanh hơn.

## 8. Ví dụ đơn giản

Ví dụ gọi trực tiếp từng form rồi gán free function vào `std::function`. Cách này cho thấy call syntax chung nhưng không giả định chi phí của chúng giống nhau.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Callable abstraction đánh đổi state, genericity, runtime flexibility và overhead; cần chọn có chủ đích.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra nhu cầu state, genericity, copyability, lifetime, target signature, allocation và call overhead.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Function pointer, functor, generic lambda và std::function là gì?
2. Trung bình — Callable nào trong ví dụ lưu hệ số nhân như state của object?
3. Khó — Vì sao move-only lambda ngày 11 không thể copy vào `std::function` C++14 dù call signature khớp?
