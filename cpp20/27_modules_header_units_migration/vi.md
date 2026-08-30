# Ngày 27 — Modules, header units và migration từ header

## 1. Vấn đề nó giải quyết

Header unit cho toolchain phù hợp import legacy header như unit đã biên dịch, còn migration từng bước giúp consumer cũ và mới cùng hoạt động. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- Module unit và `#include` truyền thống ở Ngày 26.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Header unit là cây cầu: header cũ đi qua gần như nguyên vẹn nhưng importer dùng biểu diễn đã biên dịch thay vì dán văn bản. Hãy đọc `import <header>` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
import <vector>; // after the toolchain builds the header unit
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `import <header>`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Macro và giả định include-order không đi qua module boundary như declaration thường; hỗ trợ compiler và lệnh build cũng khác nhau.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi build system hỗ trợ header unit rõ ràng và migration đã đo đạc giúp giảm parse lặp.
- Tránh dùng khi khả năng build portable hoặc hành vi legacy phụ thuộc macro chưa được kiểm soát.

## 8. Ví dụ đơn giản

Tệp chạy được in ba fragment riêng: include truyền thống, header-unit import và phác thảo migration sang named module. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `import <header>` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `import <header>` trong ví dụ tối thiểu là gì?
2. Trung bình — Header unit đã build thành công tránh thao tác văn bản nào của `#include`?
3. Khó — Vì sao thay mọi include bằng import một cách máy móc có thể đổi hành vi macro quan sát được dù declaration nhìn giống nhau?
