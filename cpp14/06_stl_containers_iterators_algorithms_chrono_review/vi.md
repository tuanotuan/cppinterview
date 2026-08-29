# Ngày 6 — Ôn STL containers, iterators, algorithms và std::chrono

## 1. Vấn đề nó giải quyết

Chương trình thường xuyên cần collection, duyệt dữ liệu, thao tác tái sử dụng và đo thời gian an toàn về kiểu. Thư viện chuẩn tách nơi lưu dữ liệu, iterator range, algorithm và thời lượng để ghép chúng mà không phải viết lại vòng lặp.

## 2. Kiến thức cần có

- Ngày 1-5; template, lambda, range biểu diễn bằng `begin`/`end` và output cơ bản.

## 3. Ý tưởng cốt lõi

Container sở hữu phần tử, iterator đánh dấu range nửa kín nửa hở, algorithm làm việc trên range đó và `std::chrono` biểu diễn thời gian bằng đơn vị rõ ràng.

## 4. Cú pháp tối thiểu

```cpp
std::sort(values.begin(), values.end());
auto elapsed = end - start;
```

## 5. Cách nó hoạt động

1. Vector lưu các giá trị mẫu và cung cấp random-access iterator tới đầu cùng vị trí sau phần tử cuối.
2. Algorithm sắp xếp thay đổi thứ tự trong iterator range, còn steady clock đo khoảng thời gian quanh thao tác.
3. Các giá trị được in tăng dần và phép kiểm tra thời lượng vẫn đúng ngay cả khi số tick đo được bằng không.

## 6. Lỗi thường gặp

- Truyền iterator của hai container khác nhau hoặc dùng iterator đã invalid sẽ gây undefined behavior.
- Trước khi áp dụng mẫu, phải kiểm tra container sở hữu dữ liệu, range nửa kín nửa hở, tính hợp lệ của iterator và đơn vị clock.

## 7. Khi nào nên dùng

- Nên dùng khi container và algorithm chuẩn đã mô tả chính xác, an toàn thao tác cần làm.
- Tránh dùng khi cần control flow đặc biệt mà algorithm đã chọn không thể diễn đạt rõ.

## 8. Ví dụ đơn giản

Danh sách điểm ngắn được sắp xếp bằng `std::sort`. `steady_clock` chỉ bao quanh thao tác cần quan sát, rồi chương trình in dãy đã sắp xếp và phép kiểm tra thời lượng hợp lệ.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Code STL dễ đoán khi tách rõ container, range, algorithm và đơn vị thời gian.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra container sở hữu dữ liệu, range nửa kín nửa hở, tính hợp lệ của iterator và đơn vị clock.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Ôn STL containers, iterators, algorithms và std::chrono là gì?
2. Trung bình — Những phần tử nào thuộc range `[values.begin(), values.end())`, và vì sao không dereference end iterator?
3. Khó — Điều gì có thể xảy ra nếu iterator được lưu trước lúc vector reallocate rồi đem dùng với algorithm sau đó?
