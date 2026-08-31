# Ngày 17 — Kéo dài lifetime trong range-based `for`

## 1. Vấn đề nó giải quyết

Biểu thức range có thể chứa temporary lồng nhau. C++23 kéo dài lifetime của temporary tạo trong for-range-initializer đến hết vòng lặp, ngăn các mẫu tham chiếu treo quan trọng.

## 2. Kiến thức cần có

- Ngày 3: lifetime của temporary object.
- Ngày 5: range, iterator và sentinel.

## 3. Ý tưởng cốt lõi

Vòng lặp ngầm giữ biểu thức range đã đánh giá trong một biến ẩn. C++23 còn bảo vệ các temporary hỗ trợ trong initializer, trừ ngoại lệ lifetime tham số thông thường. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
for (char c : make_words().front()) { use(c); }
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Kéo dài lifetime trong range-based `for`.
1. Chương trình duyệt ký tự lấy qua phần tử của container tạm khi compiler hỗ trợ.
1. Cuối cùng, nó in hoặc kiểm tra toàn bộ từ mà không đọc vùng nhớ đã bị hủy để dễ đối chiếu.

## 6. Lỗi thường gặp

- Cho rằng mọi temporary qua tham số hàm đều được kéo dài là sai; hàm trả tham chiếu đến tham số by-value vẫn trả tham chiếu treo.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi vòng lặp gọn trên subobject hoặc view tạo trong for-range-initializer an toàn.
- Tránh dùng khi chuỗi biểu thức khéo léo nhưng khó chứng minh quan hệ sở hữu và tham chiếu.

## 8. Ví dụ đơn giản

Vòng lặp hiển thị ký tự của chuỗi đầu trong danh sách tạm do helper trả về. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Temporary nào được kéo dài trong `for (auto x : f().g())`, và vì sao tham chiếu treo trả từ bên trong `g()` vẫn có thể không an toàn?
