# Câu 172: Standard Template Library (STL) là gì? Hãy kể tên một số container thường dùng.

## 1. Vấn đề nó giải quyết

Đây là một chủ đề phỏng vấn C++ độc lập trong bộ Real-World C++ Interviews. Mục tiêu là trả lời đúng trọng tâm, nêu quy tắc chi phối và phân biệt hành vi do chuẩn quy định với chi tiết riêng của compiler.

## 2. Kiến thức cần có

- Cú pháp C++ cơ bản và cách đọc kiểu của biểu thức.
- Khái niệm lifetime, ownership, overload resolution hoặc library contract khi chúng liên quan.
- Khả năng lần theo một ví dụ nhỏ trước khi kết luận.

## 3. Ý tưởng cốt lõi

STL là nền tảng generic programming của thư viện chuẩn C++, xoay quanh container, iterator, algorithm và function object. Sequence container phổ biến gồm `vector`, `array`, `deque`, `list`, `forward_list`; associative container có thứ tự gồm `map`, `set`; biến thể unordered dựa trên hash; adaptor gồm `stack`, `queue`, `priority_queue`. Cần chọn container theo access pattern, quy tắc invalidation, ordering và yêu cầu độ phức tạp thay vì theo thói quen.

Một câu trả lời phỏng vấn tốt nên nói kết luận trước, sau đó giải thích điều kiện áp dụng và chốt lại hệ quả thực tế.

## 4. Cú pháp tối thiểu

~~~cpp
std::vector<int> values; std::unordered_map<std::string, int> counts;
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

Dùng kiến thức này khi review API, đọc code, giải thích diagnostic hoặc thiết kế abstraction có liên quan đến template và kỹ thuật C++ hiện đại. Trong code production, hãy ưu tiên dạng làm contract hiện rõ và được compiler kiểm tra.

## 8. Ví dụ đơn giản

File <code>main.cpp</code> đi kèm là ví dụ nhỏ, tự chứa và biên dịch bằng C++20:

~~~cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::vector<int> values{3, 1, 2};
    std::sort(values.begin(), values.end());

    std::unordered_map<std::string, int> counts{{"cpp", 3}};
    std::cout << values.front() << ' ' << counts.at("cpp") << std::endl;
~~~

Chạy với warning nghiêm ngặt để đối chiếu kết luận thay vì ghi nhớ output máy móc.

## 9. Điều cần nhớ

- STL là nền tảng generic programming của thư viện chuẩn C++, xoay quanh container, iterator, algorithm và function object. Sequence container phổ biến gồm `vector`, `array`, `deque`, `list`, `forward_list`; associative container có thứ tự gồm `map`, `set`; biến thể unordered dựa trên hash; adaptor gồm `stack`, `queue`, `priority_queue`. Cần chọn container theo access pattern, quy tắc invalidation, ordering và yêu cầu độ phức tạp thay vì theo thói quen.
- Độ khó ước tính: **Khó**.
- Câu hỏi giữ nguyên một mục nguồn; không có biến thể Dễ/Trung bình/Khó được tự sinh.
- Nội dung giải thích và code mẫu được biên soạn lại độc lập từ chủ đề phỏng vấn.

## 10. Câu hỏi tự kiểm tra

1. Khó — Standard Template Library (STL) là gì? Hãy kể tên một số container thường dùng.
