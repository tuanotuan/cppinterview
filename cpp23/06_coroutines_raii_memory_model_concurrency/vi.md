# Ngày 6 — Coroutines, RAII, memory model và concurrency

## 1. Vấn đề nó giải quyết

Công việc đồng thời hoặc bị tạm dừng tạo trạng thái sống lâu hơn một lời gọi thường. RAII quản lý dọn dẹp, còn memory model quy định đọc ghi xuyên thread nào hợp lệ và quan sát được.

## 2. Kiến thức cần có

- Ngày 3: lifetime và move semantics.
- Ngày 5: dãy lười và phép duyệt.

## 3. Ý tưởng cốt lõi

Coroutine cất lời gọi đang tạm dừng trong một frame; RAII sở hữu frame hoặc thread; memory model là luật giao thông cho dữ liệu dùng chung. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
std::jthread worker([&] { counter.fetch_add(1); });
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Coroutines, RAII, memory model và concurrency.
1. Chương trình khởi chạy hai thread được RAII quản lý để cập nhật bộ đếm atomic.
1. Cuối cùng, nó in hoặc kiểm tra kết quả đếm xác định sau khi hai đối tượng thread ra khỏi scope và tự join để dễ đối chiếu.

## 6. Lỗi thường gặp

- Dùng `int` thường cho ghi không đồng bộ tạo data race và undefined behavior; quên quyền sở hữu frame có thể rò rỉ hoặc hủy trạng thái đang tạm dừng quá sớm.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi công việc bất đồng bộ có cấu trúc, quyền sở hữu rõ và quy tắc đồng bộ có lý do.
- Tránh dùng khi thread hoặc coroutine chỉ để làm công việc tuần tự trông nâng cao hơn.

## 8. Ví dụ đơn giản

Bộ đếm nền dùng `std::jthread` để tự join và `std::atomic` để cập nhật không có data race. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — Vì sao RAII tự join ngăn lỗi lifetime nhưng tự nó không làm hai lần ghi vào `int` dùng chung trở nên an toàn?
