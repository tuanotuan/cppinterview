# Ngày 32 — Queue, priority queue và ring buffer

## 1. Vấn đề nó giải quyết

Workload khác nhau cần quy tắc lấy phần tử khác nhau. `std::queue` cung cấp FIFO, `std::priority_queue` cho phần tử ưu tiên cao nhất, còn ring buffer tái sử dụng vùng nhớ cố định bằng index quay vòng.

## 2. Kiến thức cần có

- Ngày 25-26 và 31: sequence storage, container adapter, array fixed-size, index và complexity.

## 3. Ý tưởng cốt lõi

Queue mô tả thứ tự đến, priority queue dựa trên heap mô tả độ ưu tiên, còn ring ánh xạ vị trí logic bằng `(head + offset) % capacity`. Hãy chọn theo semantics trước khi tối ưu nhỏ.

## 4. Cú pháp tối thiểu

```cpp
std::queue<int> fifo;
std::priority_queue<int> priorities;
slot = ring[(head + offset) % ring.size()];
```

## 5. Cách nó hoạt động

1. FIFO và priority adapter nhận cùng giá trị cố định nhưng cho next element khác nhau.
2. Insertion vào ring buffer ghi đè slot cũ nhất khi capacity đầy rồi tiến logical head.
3. Ví dụ in FIFO front là 3, priority top là 9 và dãy ring còn giữ là 20, 30, 40.

## 6. Lỗi thường gặp

- Gọi `front` hoặc `top` trên adapter rỗng là undefined behavior; policy khi ring đầy cũng phải rõ.
- Trước khi áp dụng mẫu, phải kiểm tra semantics thứ tự, trạng thái rỗng, policy khi buffer đầy, phép toán wraparound, capacity và nhu cầu đồng bộ.

## 7. Khi nào nên dùng

- Nên dùng khi thứ tự xử lý là FIFO, theo độ ưu tiên hoặc streaming hữu hạn với vùng nhớ dự đoán được.
- Tránh dùng khi random access hoặc xóa tùy ý ở giữa là thao tác chính.

## 8. Ví dụ đơn giản

Ba cấu trúc nhỏ nhận các số cố định. Ring có capacity ba; chèn giá trị thứ tư cố ý loại phần tử cũ nhất để minh họa overwrite policy.

File `.cpp` dùng dữ liệu cố định để tự đoán và kiểm tra output.

## 9. Điều cần nhớ

- Chọn queue là tuyên bố phần tử nào được lấy tiếp theo và giới hạn lưu trữ ra sao.
- Compiler hoặc thư viện luôn theo quy tắc cụ thể; cần kiểm tra semantics thứ tự, trạng thái rỗng, policy khi buffer đầy, phép toán wraparound, capacity và nhu cầu đồng bộ.
- Ưu tiên cách viết nhỏ nhất thể hiện rõ ý định và đo đạc khi hiệu năng thực sự quan trọng.

## 10. Câu hỏi tự kiểm tra

1. Dễ — Mục đích chính của Queue, priority queue và ring buffer là gì?
2. Trung bình — Sau khi push 3, 9 và 5, `front` của FIFO và `top` của priority trả gì?
3. Khó — Khi ring overwrite đã đầy nhận giá trị thứ tư với capacity ba, `head` phải đổi thế nào để giữ logical order?
