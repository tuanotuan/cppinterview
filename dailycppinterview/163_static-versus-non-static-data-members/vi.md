# Câu 163: Static data member và data member thông thường khác nhau như thế nào?

## 1. Vấn đề nó giải quyết

Đây là một chủ đề phỏng vấn C++ độc lập trong bộ Real-World C++ Interviews. Mục tiêu là trả lời đúng trọng tâm, nêu quy tắc chi phối và phân biệt hành vi do chuẩn quy định với chi tiết riêng của compiler.

## 2. Kiến thức cần có

- Cú pháp C++ cơ bản và cách đọc kiểu của biểu thức.
- Khái niệm lifetime, ownership, overload resolution hoặc library contract khi chúng liên quan.
- Khả năng lần theo một ví dụ nhỏ trước khi kết luận.

## 3. Ý tưởng cốt lõi

Mỗi object chứa bản riêng của non-static data member, còn static data member thuộc về class và được chia sẻ giữa mọi object. Static member có static storage duration và có thể tồn tại khi chưa có instance; từ C++17 có thể định nghĩa nó bằng `inline static` ngay trong class. Static member function không có `this` pointer và chỉ truy cập trực tiếp static member, còn non-static member function làm việc trên một object cụ thể.

Một câu trả lời phỏng vấn tốt nên nói kết luận trước, sau đó giải thích điều kiện áp dụng và chốt lại hệ quả thực tế.

## 4. Cú pháp tối thiểu

~~~cpp
struct Item { int id{}; inline static int live_count{}; };
~~~

Cú pháp chỉ là điểm bắt đầu; cần kiểm tra kiểu, value category, lifetime và precondition thay vì suy luận từ tên gọi.

## 5. Cách nó hoạt động

1. Xác định entity hoặc biểu thức mà câu hỏi đang nói tới.
2. Áp dụng quy tắc C++ phù hợp trước khi dự đoán output hay hiệu năng.
3. Nêu rõ trường hợp ngoại lệ, hành vi phụ thuộc implementation hoặc undefined behavior nếu có.
4. Kiểm chứng bằng một chương trình tối thiểu và warning nghiêm ngặt.

## 6. Lỗi thường gặp

- Trả lời theo một lần chạy duy nhất rồi xem đó là quy tắc của chuẩn.
- Nhầm ownership với quyền truy cập hoặc nhầm compile-time selection với runtime dispatch.
- Bỏ qua precondition, lifetime hay conversion ẩn.
- Khẳng định tuyệt đối trong khi đáp án phụ thuộc context.

## 7. Khi nào nên dùng

Dùng kiến thức này khi review API, đọc code, giải thích diagnostic hoặc thiết kế abstraction có liên quan đến thiết kế đối tượng, hàm và an toàn exception. Trong code production, hãy ưu tiên dạng làm contract hiện rõ và được compiler kiểm tra.

## 8. Ví dụ đơn giản

File <code>main.cpp</code> đi kèm là ví dụ nhỏ, tự chứa và biên dịch bằng C++20:

~~~cpp
#include <iostream>

class Item {
public:
    explicit Item(int id) : id_(id) { ++live_count_; }
    Item(const Item& other) : id_(other.id_) { ++live_count_; }
    ~Item() { --live_count_; }

    int id() const { return id_; }
    static int live_count() { return live_count_; }

private:
~~~

Chạy với warning nghiêm ngặt để đối chiếu kết luận thay vì ghi nhớ output máy móc.

## 9. Điều cần nhớ

- Mỗi object chứa bản riêng của non-static data member, còn static data member thuộc về class và được chia sẻ giữa mọi object. Static member có static storage duration và có thể tồn tại khi chưa có instance; từ C++17 có thể định nghĩa nó bằng `inline static` ngay trong class. Static member function không có `this` pointer và chỉ truy cập trực tiếp static member, còn non-static member function làm việc trên một object cụ thể.
- Độ khó ước tính: **Trung bình**.
- Câu hỏi giữ nguyên một mục nguồn; không có biến thể Dễ/Trung bình/Khó được tự sinh.
- Nội dung giải thích và code mẫu được biên soạn lại độc lập từ chủ đề phỏng vấn.

## 10. Câu hỏi tự kiểm tra

1. Trung bình — Static data member và data member thông thường khác nhau như thế nào?
