# Ngày 43 — View adjacent, adjacent-transform và pairwise

## 1. Vấn đề nó giải quyết

Thuật toán dựa trên hàng xóm cần cửa sổ chồng nhau. `adjacent<N>` C++23 tạo tuple gồm `N` phần tử liên tiếp, `adjacent_transform<N>` tính từ mỗi tuple, còn `pairwise` đặt tên trường hợp `N = 2`.

## 2. Kiến thức cần có

- Ngày 42: range view tạo tuple.
- Phép so sánh cửa sổ trượt cơ bản.

## 3. Ý tưởng cốt lõi

Di chuyển cửa sổ mỗi lần một phần tử. Khác chunk, các cửa sổ liên tiếp chồng nhau nên một phần tử nguồn có thể góp vào nhiều output. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
for (auto [a, b] : values | std::views::pairwise) { }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho View adjacent, adjacent-transform và pairwise.
1. Chương trình đọc các cặp hàng xóm và biến đổi có điều kiện thành hiệu.
1. Cuối cùng, nó in hoặc kiểm tra một kết quả cho mỗi cửa sổ chồng hợp lệ để dễ đối chiếu.

## 6. Lỗi thường gặp

- Mong có output từ range ngắn hơn `N` là sai; trả tham chiếu bắt nguồn từ source tạm có thể treo cùng view.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi tính delta, phát hiện xu hướng, so sánh cục bộ và phép tính rolling độ rộng cố định.
- Tránh dùng khi chia lô không chồng, phù hợp hơn với `chunk`.

## 8. Ví dụ đơn giản

Bộ theo dõi nhiệt độ dùng cặp liên tiếp để in thay đổi giữa hai số đo kề nhau. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Với input dài `m` và `adjacent<N>`, output dài bao nhiêu khi `m >= N`, và vì sao không phải `m / N`?
