# Ngày 26 — Iterator categories, invalidation và reverse iterators

## 1. Vấn đề nó giải quyết

Algorithm cần mức khả năng duyệt khác nhau, còn mutation trên container có thể làm iterator đã lưu không dùng được. Iterator category mô tả thao tác hỗ trợ, quy tắc invalidation bảo vệ lifetime và reverse iterator biến range thành chiều ngược.

## 2. Kiến thức cần có

- Ngày 6 và 25: container, range nửa kín nửa hở, capacity, reallocation và algorithm.

## 3. Ý tưởng cốt lõi

Iterator là vị trí gắn với một range cụ thể, không phải index tồn tại vĩnh viễn. Cần hỏi category của nó, thao tác có đổi vùng lưu trữ không và adapter chiều nào đang được dùng.

## 4. Cú pháp tối thiểu

```cpp
values.reserve(4);
auto first = values.begin();
values.push_back(4); // no reallocation within capacity
for (auto it = values.rbegin(); it != values.rend(); ++it) { }
```

## 5. Cách nó hoạt động

1. Vector reserve đủ vùng nhớ trước khi lưu iterator tới phần tử đầu.
2. Một lần chèn vẫn nằm trong capacity nên iterator đã lưu còn hợp lệ; reverse iterator sau đó duyệt từ cuối về đầu.
3. Giá trị đầu ban đầu được in an toàn và phép duyệt ngược in mọi phần tử theo thứ tự vị trí giảm dần.

## 6. Lỗi thường gặp

- Dereference iterator sau khi vector reallocate là undefined behavior dù debugger có vẻ cho thấy địa chỉ số không đổi.
- Trước khi áp dụng mẫu, phải kiểm tra iterator category, container sở hữu, mutation đã làm, quy tắc invalidation được tài liệu hóa và end sentinel đúng.

## 7. Khi nào nên dùng

- Nên dùng khi generic code cần diễn đạt yêu cầu duyệt hoặc range của container phải được đi từ cuối về đầu.
- Tránh dùng khi iterator được giữ qua mutation không kiểm soát; hãy lấy lại iterator hoặc thiết kế lại vòng lặp.

## 8. Ví dụ đơn giản

Capacity được cố định ở bốn trước khi lưu `begin`. Lần chèn thứ tư không reallocate, sau đó `rbegin` và `rend` tạo reverse range an toàn.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Tính hợp lệ của iterator là hệ quả được tài liệu hóa của thao tác container, không được đoán từ địa chỉ.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra iterator category, container sở hữu, mutation đã làm, quy tắc invalidation được tài liệu hóa và end sentinel đúng.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Iterator categories, invalidation và reverse iterators là gì?
2. Trung bình — Vì sao `begin` đã lưu vẫn dùng được sau lần `push_back` cuối trong ví dụ?
3. Khó — Vì sao `rend()` là sentinel chứ không phải iterator có thể dereference để lấy phần tử trước phần tử đầu?
