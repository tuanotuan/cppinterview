# Ngày 40 — `std::ranges::to` và `std::from_range`

## 1. Vấn đề nó giải quyết

Range lười cuối cùng thường cần materialize thành container sở hữu. `std::ranges::to` thực hiện chuyển đổi tường minh, còn `std::from_range` chọn constructor container nhận range.

## 2. Kiến thức cần có

- Ngày 5: pipeline view lười.
- Ngày 39: tính const của range và iterator.

## 3. Ý tưởng cốt lõi

View là công thức; container sở hữu là món hoàn chỉnh. `ranges::to` nêu thẳng loại món đích, còn `from_range` đánh dấu cách hiểu constructor mong muốn. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto values = std::ranges::to<std::vector<int>>(view);
std::vector copy(std::from_range, values);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::ranges::to` và `std::from_range`.
1. Chương trình materialize view số nguyên đã biến đổi rồi tạo vector thứ hai từ range khi được hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra các giá trị biến đổi được sở hữu hoặc thông báo khả dụng chính xác để dễ đối chiếu.

## 6. Lỗi thường gặp

- Materialize range vô hạn sẽ không kết thúc; cho rằng chuyển đổi giữ tham chiếu có thể sai vì đích thường sở hữu phần tử mới.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi ranh giới nơi pipeline lười phải trở thành dữ liệu sở hữu, lưu, sort hoặc trả độc lập.
- Tránh dùng khi bước trung gian vẫn có thể lười để tránh cấp phát.

## 8. Ví dụ đơn giản

View ID hợp lệ đã lọc được materialize thành vector trước khi lưu trong request object. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Khi đổi view chứa tham chiếu thành `std::vector<T>`, giá trị nào được copy hoặc move, và vì sao vector không kéo dài lifetime range nguồn?
