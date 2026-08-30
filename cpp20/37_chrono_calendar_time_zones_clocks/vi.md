# Ngày 37 — Chrono calendar, time zones và clock conversion

## 1. Vấn đề nó giải quyết

Chrono C++20 mô hình hóa civil date, instant theo clock và diễn giải time zone bằng type riêng thay vì số nguyên không nhãn. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Chrono duration, time point và calendar cơ bản.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Calendar date là nhãn trang lịch, time point là vị trí trên timeline của clock, còn time zone là bộ luật dịch instant cho một vùng. Hãy đọc `std::chrono::year_month_day` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
std::chrono::year_month_day date{2026y, August, 30d};
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::chrono::year_month_day`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Civil date một mình chưa xác định instant duy nhất; chuyển daylight-saving có thể mơ hồ và time-zone database của thư viện có thể chưa đầy đủ.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi code cần date có type, conversion an toàn theo duration hoặc diễn giải theo vùng được platform hỗ trợ.
- Tránh dùng khi đo elapsed time đơn điệu chỉ cần `steady_clock`.

## 8. Ví dụ đơn giản

Ví dụ đổi ngày cố định sang `sys_days`; code có guard báo libstdc++ hiện tại có time-zone support C++20 hay không. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::chrono::year_month_day` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::chrono::year_month_day` trong ví dụ tối thiểu là gì?
2. Trung bình — Thiếu thông tin gì nếu xem `year_month_day` như đã xác định một local wall-clock instant?
3. Khó — Vì sao chuyển giữa epoch của clock khác với chọn time zone cho civil date?
