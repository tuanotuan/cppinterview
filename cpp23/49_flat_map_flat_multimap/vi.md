# Ngày 49 — `std::flat_map` và `std::flat_multimap`

## 1. Vấn đề nó giải quyết

Map dựa trên node cho node ổn định và chèn riêng lẻ rẻ nhưng locality cache kém. Flat map C++23 lưu key và value đã sort trong container nền liên tục để đổi lấy tradeoff hiệu năng khác.

## 2. Kiến thức cần có

- Ngày 40: tạo container từ range.
- Container kết hợp có thứ tự và độ phức tạp cơ bản.

## 3. Ý tưởng cốt lõi

Hãy hình dung bảng đã sort thay vì cây các hộp. Lookup dùng tìm kiếm có thứ tự; chèn có thể dời cả hậu tố. `flat_map` giữ key duy nhất, `flat_multimap` cho phép lặp. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::flat_map<int, std::string> names{{1, "one"}};
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho `std::flat_map` và `std::flat_multimap`.
1. Chương trình tạo flat container key duy nhất và key lặp khi header tồn tại.
1. Cuối cùng, nó in hoặc kiểm tra output key-value có thứ tự hoặc thông báo hỗ trợ chính xác để dễ đối chiếu.

## 6. Lỗi thường gặp

- Chèn thường xuyên vào giữa có thể đắt và làm iterator mất hiệu lực; cho rằng tham chiếu ổn định như `std::map` là sai.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi bảng nhỏ hoặc vừa chủ yếu lookup, được dựng theo batch và hưởng lợi locality.
- Tránh dùng khi workload sửa nhiều cần địa chỉ node ổn định hoặc chèn riêng lẻ rẻ.

## 8. Ví dụ đơn giản

Bảng lệnh được dựng một lần từ ID đã sort rồi truy vấn nhiều lần khi chương trình chạy. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao lookup `flat_map` thân thiện cache còn insertion vẫn tuyến tính, và đặc điểm workload nào quyết định tradeoff có lợi?
