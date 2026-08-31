# Ngày 31 — Tiện ích enum và bit

## 1. Vấn đề nó giải quyết

C++23 làm rõ các ý định thấp tầng phổ biến: `std::to_underlying` lấy biểu diễn nguyên của enum, `std::is_scoped_enum` nhận diện scoped enum và `std::byteswap` đảo thứ tự byte.

## 2. Kiến thức cần có

- Ngày 20: kiểu số nguyên và dấu.
- Scoped enum và biểu diễn bit cơ bản.

## 3. Ý tưởng cốt lõi

Enum là số nguyên có nhãn, type trait là câu hỏi compile-time, còn byteswap đảo đầu cuối một word nhiều byte mà không đổi bit bên trong từng byte. Hãy xác định giá trị đang được biến đổi rồi kiểm tra kiểu, lifetime hoặc quyền sở hữu kết quả. Bật C++23 chưa chắc thư viện đã triển khai đủ, vì vậy cần kiểm tra feature-test macro liên quan.

## 4. Cú pháp tối thiểu

```cpp
auto raw = std::to_underlying(code);
auto reversed = std::byteswap(raw);
```

## 5. Cách nó hoạt động

1. Ví dụ tạo biểu thức hoặc đối tượng nhỏ nhất cho Tiện ích enum và bit.
1. Chương trình kiểm tra enum là scoped, lấy giá trị rồi đảo hai byte.
1. Cuối cùng, nó in hoặc kiểm tra số nguyên gốc, kết quả trait đúng và số nguyên đã đảo byte để dễ đối chiếu.

## 6. Lỗi thường gặp

- Dùng byteswap khi chưa xác định endianness nguồn và máy có thể đảo hai lần; thay type safety của enum bằng số thô làm interface yếu đi.
- Không kiểm tra feature-test macro có thể chọn nhánh mã thư viện hiện tại chưa hỗ trợ.

## 7. Khi nào nên dùng

- Nên dùng khi định dạng nhị phân, ranh giới giao thức và mã generic xử lý riêng scoped enum.
- Tránh dùng khi số học thông thường nơi thứ tự byte không liên quan hoặc enum nên giữ kiểu mạnh.

## 8. Ví dụ đơn giản

Parser gói tin đổi trường mạng hai byte sang thứ tự máy rồi ánh xạ số đó thành status code scoped. Chương trình dùng dữ liệu cố định để output dễ kiểm tra.

## 9. Điều cần nhớ

- Tách quy tắc chuẩn khỏi mức hỗ trợ thực tế.
- Làm rõ lifetime, ownership và kiểu suy luận.
- Ưu tiên cú pháp ngắn, đúng ý định.
- Guard tính năng chưa được hỗ trợ đồng đều.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Cú pháp ngắn nhất ở Phần 4 là gì và nhiệm vụ chính của nó là gì?
1. Trung bình — Đọc chương trình mẫu: giá trị, kiểu hoặc nhánh nào được quan sát, và vì sao?
1. Khó — `std::to_underlying` có giữ đúng signedness của underlying type không, và điều đó ảnh hưởng việc instantiate `std::byteswap` phía sau thế nào?
