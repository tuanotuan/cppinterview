# Câu 161: Giải thích encapsulation bằng một ví dụ.

## 1. Vấn đề nó giải quyết

Đây là một chủ đề phỏng vấn C++ độc lập trong bộ Real-World C++ Interviews. Mục tiêu là trả lời đúng trọng tâm, nêu quy tắc chi phối và phân biệt hành vi do chuẩn quy định với chi tiết riêng của compiler.

## 2. Kiến thức cần có

- Cú pháp C++ cơ bản và cách đọc kiểu của biểu thức.
- Khái niệm lifetime, ownership, overload resolution hoặc library contract khi chúng liên quan.
- Khả năng lần theo một ví dụ nhỏ trước khi kết luận.

## 3. Ý tưởng cốt lõi

Encapsulation đóng gói state cùng các operation duy trì invariant và che giấu chi tiết biểu diễn sau một interface ổn định. Nó không chỉ là đặt field thành private rồi thêm getter/setter không hạn chế; caller nên diễn đạt operation hợp lệ của domain như `withdraw`, còn class từ chối transition không hợp lệ như số dư âm. Cách này giảm coupling và cho phép đổi implementation mà không buộc caller đổi theo.

Một câu trả lời phỏng vấn tốt nên nói kết luận trước, sau đó giải thích điều kiện áp dụng và chốt lại hệ quả thực tế.

## 4. Cú pháp tối thiểu

~~~cpp
class Account { public: bool withdraw(int amount); private: int balance{}; };
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

class Account {
public:
    explicit Account(int balance) : balance_(balance >= 0 ? balance : 0) {}

    bool withdraw(int amount) {
        if (amount <= 0 || amount > balance_) return false;
        balance_ -= amount;
        return true;
    }
~~~

Chạy với warning nghiêm ngặt để đối chiếu kết luận thay vì ghi nhớ output máy móc.

## 9. Điều cần nhớ

- Encapsulation đóng gói state cùng các operation duy trì invariant và che giấu chi tiết biểu diễn sau một interface ổn định. Nó không chỉ là đặt field thành private rồi thêm getter/setter không hạn chế; caller nên diễn đạt operation hợp lệ của domain như `withdraw`, còn class từ chối transition không hợp lệ như số dư âm. Cách này giảm coupling và cho phép đổi implementation mà không buộc caller đổi theo.
- Độ khó ước tính: **Trung bình**.
- Câu hỏi giữ nguyên một mục nguồn; không có biến thể Dễ/Trung bình/Khó được tự sinh.
- Nội dung giải thích và code mẫu được biên soạn lại độc lập từ chủ đề phỏng vấn.

## 10. Câu hỏi tự kiểm tra

1. Trung bình — Giải thích encapsulation bằng một ví dụ.
