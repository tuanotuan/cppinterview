# Ngày 32 — View pipelines, borrowed ranges và dangling views

## 1. Vấn đề nó giải quyết

Pipeline ghép các lazy adaptor, còn borrowed-range rule cho biết iterator có thể sống sau range object truyền vào algorithm hay không. Nó làm một giả định quan trọng trở nên rõ và có thể kiểm tra.

## 2. Kiến thức cần có

- View, ownership, lifetime và range algorithm.
- Bạn cần biết biên dịch chương trình ngắn và đọc output.

## 3. Ý tưởng cốt lõi

Pipeline nối nhiều thấu kính trên một nguồn. Borrowed status nói việc hủy vật giữ thấu kính có hủy luôn phần tử được nhìn hay không. Hãy đọc `std::ranges::borrowed_range` như lời hứa chính xác; runtime precondition vẫn do lập trình viên chịu trách nhiệm.

## 4. Cú pháp tối thiểu

```cpp
auto pipeline = values | std::views::filter(pred) | std::views::transform(map);
```

## 5. Cách nó hoạt động

1. Chương trình đưa vào dạng nhỏ nhất cần thiết của `std::ranges::borrowed_range`.
2. Nó áp dụng tính năng lên dữ liệu cố định và giữ owner cần thiết trong scope.
3. Nó in một kết quả để đối chiếu trực tiếp với source.

## 6. Lỗi thường gặp

- Tạo pipeline sống lâu từ nguồn sống ngắn hoặc reference capture sẽ dangling dù bước construction vẫn thành công.
- Hãy kiểm tra cả header, mức hỗ trợ thư viện C++20, lifetime và kiểu được suy luận.

## 7. Khi nào nên dùng

- Nên dùng khi nhiều lazy transformation cần đọc từ trái sang phải và lifetime nguồn rõ ràng.
- Tránh dùng khi ownership phải đi qua boundary pipeline hoặc lifetime khó chứng minh.

## 8. Ví dụ đơn giản

Một named vector cấp dữ liệu cho filter-transform pipeline; static assertion đối chiếu borrowed `span` với owning `vector`. Tệp `.cpp` không nhận input nên kết quả dễ lặp lại.

## 9. Điều cần nhớ

- `std::ranges::borrowed_range` diễn đạt ý tưởng C++20 trung tâm của ngày này.
- Ví dụ cô lập một hành vi bằng dữ liệu cố định.
- Compiler check không thay thế suy luận về lifetime và runtime.
- Ưu tiên interface nhỏ nhất nói đúng yêu cầu thật.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Nhiệm vụ chính của `std::ranges::borrowed_range` trong ví dụ tối thiểu là gì?
2. Trung bình — Vì sao `std::span<int>` là borrowed range còn `std::vector<int>` thì không?
3. Khó — Named lvalue vector làm ví dụ an toàn thế nào dù view kết quả không sở hữu phần tử?
