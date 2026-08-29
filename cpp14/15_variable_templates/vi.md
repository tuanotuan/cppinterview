# Ngày 15 — Variable templates

## 1. Vấn đề nó giải quyết

Trước C++14, hằng phụ thuộc kiểu thường phải đặt trong function template hoặc static member của class template. Variable template mô tả trực tiếp một họ biến được chọn bằng template argument.

## 2. Kiến thức cần có

- Ngày 5 và 14: template, type parameter, `constexpr` và template argument ghi rõ.

## 3. Ý tưởng cốt lõi

Hãy xem khai báo như bảng compile-time có khóa là kiểu. Viết `pi<float>` và `pi<double>` chọn hai constant instantiation có kiểu riêng.

## 4. Cú pháp tối thiểu

```cpp
template<class T>
constexpr T pi = T(3.1415926535897932385L);
```

## 5. Cách nó hoạt động

1. Template argument xác định kiểu khai báo của một specialization cụ thể của variable template.
2. Initializer chuyển literal chung sang kiểu đó trong quá trình constant initialization.
3. Chương trình dùng specialization kiểu double để tính và in diện tích hình tròn.

## 6. Lỗi thường gặp

- Định nghĩa variable template không const trong header mà không hiểu linkage có thể tạo shared state hoặc definition bất ngờ.
- Trước khi áp dụng mẫu, phải kiểm tra template argument, kiểu biến được instantiate, phép chuyển initializer, constness và linkage.

## 7. Khi nào nên dùng

- Nên dùng khi hằng có tên hoặc giá trị trait thay đổi tự nhiên theo kiểu hay compile-time parameter khác.
- Tránh dùng khi một hằng thông thường đã đủ hoặc function diễn đạt phép tính trì hoãn chính xác hơn.

## 8. Ví dụ đơn giản

Variable template `pi` có kiểu giúp tránh lặp hằng riêng cho float và double. Ví dụ chọn `pi<double>` vì bán kính được biểu diễn bằng double.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Variable template đem khả năng tái sử dụng có parameter cho value giống như function và class template làm với hành vi và kiểu.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra template argument, kiểu biến được instantiate, phép chuyển initializer, constness và linkage.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Variable templates là gì?
2. Trung bình — `pi<float>` có kiểu gì và phép chuyển từ long-double literal diễn ra ở đâu?
3. Khó — Vì sao variable template trong header cần cẩn thận hơn về linkage và definition so với biến `constexpr` cục bộ?
