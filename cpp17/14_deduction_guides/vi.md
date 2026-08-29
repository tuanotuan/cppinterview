# Ngày 14 — Deduction guides

## 1. Vấn đề nó giải quyết

Parameter type của constructor không phải lúc nào cũng biểu diễn class-template argument mong muốn. Deduction guide cung cấp mapping rõ từ initialization argument sang specialization.

## 2. Kiến thức cần có

- Compiler hỗ trợ C++17, được gọi với warning đầy đủ, cùng các bài trước theo thứ tự của khóa học.
- Hiểu CTAD ngày 13, overload resolution, conversion và khởi tạo class template.

## 3. Ý tưởng cốt lõi

Guide có parameter giống function và trailing template-id nhưng không phải callable function. Nó chỉ tham gia deduction; specialization kết quả vẫn phải dựng được từ initializer ban đầu.

## 4. Cú pháp tối thiểu

```cpp
template<class T> struct Box { T value; };
template<class T> Box(T) -> Box<T>;
Box(const char*) -> Box<std::string>;
```

## 5. Cách nó hoạt động

1. Guide tổng quát giữ argument type, còn guide cụ thể map pointer type của string literal sang `std::string` sở hữu dữ liệu.
2. Overload resolution chọn guide cụ thể, suy ra `Box<std::string>`, rồi aggregate initialization thực hiện conversion.
3. Chương trình in `number: 42` và `text: C++17`, tạo test oracle nhỏ để so sánh với dự đoán trước khi biên dịch.

## 6. Lỗi thường gặp

- Guide có thể làm deduction thành công nhưng initialization sau đó lỗi, hoặc vô tình đổi ownership khi suy ra pointer thay vì owning type.
- Build thành công chưa đủ; phải kiểm tra lifetime, ordering và error path.

## 7. Khi nào nên dùng

- Nên dùng kỹ thuật này khi deduction ngầm từ constructor không thể làm hoặc chọn specialization sai semantics dự kiến.
- Nên chọn cách C++11/14 đơn giản hơn nếu quy tắc C++17 không cải thiện safety, độ rõ hoặc hiệu năng đã đo trên các toolchain phải hỗ trợ.

## 8. Ví dụ đơn giản

Guide cho string literal chủ động tạo box sở hữu string, còn guide tổng quát tạo integer box.

## 9. Điều cần nhớ

- Deduction guide chỉ điều khiển chọn type; constructor và conversion vẫn điều khiển tạo object.
- Phải chọn rõ chế độ C++17; default của compiler mới hơn có thể che lỗi portability.
- Warning và ví dụ xác định biến quy tắc ghi nhớ thành bằng chứng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Deduction guides giải quyết vấn đề chính nào?
2. Trung bình — Vì sao text box không được suy ra thành `Box<const char*>`?
3. Khó — User-defined guide và implicit guide chồng lấn có thể tạo ambiguity thế nào?
