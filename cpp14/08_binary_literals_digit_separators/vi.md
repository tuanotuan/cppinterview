# Ngày 8 — Binary literals và digit separators

## 1. Vấn đề nó giải quyết

Bit mask khó kiểm tra khi chỉ viết ở hệ thập phân hoặc thập lục phân, còn hằng số dài rất dễ đếm nhầm chữ số. C++14 thêm binary literal và dấu phân cách bằng nháy đơn để code dễ đọc mà không đổi giá trị lưu trữ.

## 2. Kiến thức cần có

- Toolchain ngày 1 và quan hệ cơ bản giữa giá trị số nguyên với cách viết của nó.

## 3. Ý tưởng cốt lõi

Prefix chọn hệ cơ số, còn separator chỉ là khoảng cách trực quan bên trong token. Compiler coi như bỏ separator, phân tích các chữ số rồi lưu một số nguyên bình thường.

## 4. Cú pháp tối thiểu

```cpp
int mask = 0b1010'0101;
int population = 1'000'000;
```

## 5. Cách nó hoạt động

1. Prefix `0b` báo cho compiler rằng mỗi chữ số sau đó là một bit nhị phân.
2. Dấu nháy đơn có thể chia nhóm chữ số hợp lệ nhưng không đóng góp giá trị số.
3. Bit mask nhị phân được in ở dạng thập phân và literal thập phân có nhóm được in thành một triệu.

## 6. Lỗi thường gặp

- Dùng chữ số không hợp lệ với hệ cơ số hoặc đặt separator sai vị trí sẽ gây lỗi biên dịch.
- Trước khi áp dụng mẫu, phải kiểm tra prefix hệ cơ số, chữ số hợp lệ, vị trí bit mong muốn và chỗ đặt separator.

## 7. Khi nào nên dùng

- Nên dùng khi hằng số biểu diễn flag, bit giao thức, quyền truy cập hoặc số dài cần dễ đọc.
- Tránh dùng khi cách chia nhóm gợi ý ý nghĩa không khớp với bit field hoặc đơn vị thật.

## 8. Ví dụ đơn giản

Một byte quyền truy cập được chia nhóm bốn bit, còn số người dùng chia nhóm ba chữ số thập phân. Sau biên dịch cả hai vẫn chỉ là số nguyên bình thường.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Định dạng literal giúp dễ kiểm tra nhưng tự nó không đổi giá trị số hay kiểu số nguyên.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra prefix hệ cơ số, chữ số hợp lệ, vị trí bit mong muốn và chỗ đặt separator.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Binary literals và digit separators là gì?
2. Trung bình — Giá trị thập phân của `0b1111'0000` là bao nhiêu?
3. Khó — Vì sao hai literal chia nhóm khác nhau như `0b1010'0101` và `0b10'100'101` vẫn biểu diễn đúng cùng một giá trị?
