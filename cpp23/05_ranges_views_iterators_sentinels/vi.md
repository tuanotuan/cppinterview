# Ngày 5 — Ranges, views, iterators và sentinels

## 1. Vấn đề nó giải quyết

Range mô tả trực tiếp một dãy, còn view tạo phép biến đổi lười mà không sinh container trung gian ngay. Iterator chỉ vị trí; sentinel đánh dấu nơi dừng duyệt.

## 2. Kiến thức cần có

- Ngày 4: hàm generic và concept.
- Vòng lặp và container chuẩn đã học trước đó.

## 3. Ý tưởng cốt lõi

Hãy hình dung băng chuyền. View gắn các trạm nhẹ như filter và transform; giá trị chỉ được xử lý khi iterator kéo chúng về phía sentinel. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto v = std::views::iota(1, 8) | std::views::filter(pred);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Ranges, views, iterators và sentinels.
1. Chương trình tạo view số nguyên lười rồi duyệt từ iterator đến sentinel.
1. Cuối cùng, nó in hoặc kiểm tra chỉ các giá trị qua bộ lọc và được biến đổi đúng lúc đọc để dễ đối chiếu.

## 6. Lỗi thường gặp

- Trả view tham chiếu đến range cục bộ đã hủy gây truy cập treo; giả sử iterator và sentinel luôn cùng kiểu cũng làm hỏng mã generic.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi pipeline đọc có thể ghép nối, nơi đánh giá lười tránh container tạm.
- Tránh dùng khi vòng lặp thường đã rõ hơn hoặc pipeline có nguồn không sống lâu bằng view.

## 8. Ví dụ đơn giản

Báo cáo lọc số đo dương và nhân đôi chúng chỉ khi tạo từng dòng hiển thị. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao `auto last = range.end()` có thể là kiểu sentinel khác `decltype(range.begin())`, và phép so sánh nào vẫn phải hoạt động?
