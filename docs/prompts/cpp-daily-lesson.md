# Prompt tạo bài học C++ hằng ngày trên GPT Web

Thay toàn bộ giá trị trong dấu `[...]`, rồi dán nguyên khối prompt bên dưới vào
GPT Web. Kết quả mong đợi là một bài giảng trong cuộc trò chuyện và đúng hai tệp
có thể tải xuống.

## Prompt

````text
Tôi đang học lộ trình C++ để hướng tới vị trí C++ Tick Data Engineer tại
WorldQuant.

Phiên bản C++: [CHỌN MỘT: C++11 | C++14 | C++17 | C++20 | C++23]
Ngày học: [SỐ NGUYÊN DƯƠNG]
Chủ đề hôm nay: [CHỦ ĐỀ]
Các chủ đề đã học trước đó: [DANH SÁCH NGẮN THEO THỨ TỰ]

Hãy hoàn thành toàn bộ yêu cầu dưới đây trong một lần trả lời. Không hỏi lại nếu
các trường trên đã được điền rõ.

## 1. Nguồn bắt buộc từ Google Drive

Trước khi giảng:

1. Dùng kết nối Google Drive của tôi và mở đúng thư mục `SimplifyCPP_Books`.
2. Tìm sách, chương và mục liên quan trực tiếp đến chủ đề hôm nay.
3. Dùng nội dung tìm được làm nguồn chính; diễn giải lại, không chép đoạn dài.
4. Ghi tên sách và chương/mục đã dùng ở phần báo cáo cuối.
5. Nếu không truy cập được thư mục, không tìm thấy nguồn phù hợp hoặc không xác
   minh được nội dung, hãy nói rõ đang bị chặn. Không tự bịa nguồn hoặc giả vờ
   đã đọc sách.

## 2. Bài giảng trong cuộc trò chuyện

Giảng bằng tiếng Việt cho người mới học, theo đúng thứ tự:

1. Kiến thức nào của những ngày trước cần dùng?
2. Chủ đề này giải quyết vấn đề gì?
3. Mô hình tư duy (mental model) đơn giản là gì?
4. Cú pháp tối thiểu cần nhớ là gì?
5. Chương trình hoạt động từng bước như thế nào?
6. Dùng sai dễ gây lỗi, undefined behavior hoặc vấn đề hiệu năng ở đâu?
7. Khi nào nên dùng và khi nào không nên dùng?
8. Chủ đề này xuất hiện thế nào trong tick data, trade, quote, order hoặc order
   book?
9. Ba câu hỏi tự kiểm tra.
10. Một bài tập nhỏ có đầu vào và kết quả mong đợi rõ ràng.

Yêu cầu giảng dạy:

- Dùng từ đơn giản; giải thích thuật ngữ ở lần xuất hiện đầu tiên.
- Kiến thức cũ phải thật sự hỗ trợ chủ đề hôm nay.
- Không dùng kiến thức thuộc ngày sau, trừ khi bắt buộc để chương trình đúng.
- Nếu bắt buộc nhắc kiến thức mới hơn, chỉ giải thích phần tối thiểu và đánh dấu
  rõ là kiến thức xem trước.
- Nếu chủ đề lớn, chỉ dạy phần cốt lõi có thể hoàn thành trong một ngày.
- Không biến ví dụ đơn giản thành hệ thống trading phức tạp.

## 3. Tạo đúng hai tệp tải xuống

Tạo đúng hai tệp thật và đính kèm để tôi tải xuống. Không dùng code block trong
cuộc trò chuyện để thay cho tệp, không tạo tệp thứ ba và không tạo tệp nén.

Tạo `topic_slug` từ chủ đề bằng chữ ASCII thường và dấu gạch dưới; không dùng
khoảng trắng, dấu `*`, dấu ngoặc hoặc ký tự tiếng Việt. Tên hai tệp phải là:

- `day_[SỐ NGÀY]_[topic_slug].cpp`
- `day_[SỐ NGÀY]_[topic_slug].md`

Nếu môi trường không thể tạo tệp đính kèm có thể tải xuống, hãy nói rõ giới hạn
đó; không được tuyên bố rằng đã tạo tệp.

## 4. Yêu cầu đối với tệp C++

Tệp C++ phải:

- là một chương trình hoàn chỉnh, tự chạy được;
- chỉ minh họa chủ đề hôm nay;
- dùng ví dụ trading đơn giản với Tick, Trade, Quote, Order, Price hoặc Volume;
- không dùng thư viện ngoài;
- không có nhiều class hoặc abstraction không cần thiết;
- dài khoảng 30–70 dòng;
- có comment ngắn ở những dòng quan trọng;
- dùng dữ liệu đầu vào cố định và kết quả đầu ra dễ kiểm tra; và
- không dùng tính năng mới hơn phiên bản C++ đã chọn.

## 5. Định dạng bắt buộc của tệp Markdown

Tệp Markdown phải dùng UTF-8, viết bằng tiếng Anh đơn giản và dài khoảng 300–500
từ. Dòng đầu tiên phải là đúng một heading cấp 1. Mỗi phần chính phải là heading
cấp 2 có số thứ tự. Không viết tiêu đề phần như một dòng văn bản thường.

Dùng chính xác skeleton sau và thay mọi nội dung giữ chỗ:

~~~markdown
# Day [SỐ NGÀY] — [ENGLISH TOPIC TITLE]

## 1. Problem It Solves

[One or two short paragraphs.]

## 2. Prerequisites

- [Only knowledge from earlier days.]

## 3. Core Idea

[A simple mental model.]

## 4. Minimal Syntax

```cpp
// Only the smallest syntax fragment needed for this topic.
```

## 5. How It Works

1. [Step one.]
2. [Step two.]
3. [Step three.]

## 6. Common Mistakes

- [Concrete mistake and consequence.]

## 7. When to Use It

- Use it when [...]
- Avoid it when [...]

## 8. Trading Use Case

[One simple tick, trade, quote, order, price, volume, or order-book example.]

## 9. Key Takeaways

- [Three to five concise points.]

## 10. Self-Check Questions

1. [Question one?]
2. [Question two?]
3. [Question three?]

## 11. Small Exercise

[A small task with fixed input and an expected result.]
~~~

Quy tắc Markdown:

- Có đúng một dòng trống sau mỗi heading và trước/sau list hoặc fenced code.
- Dùng `-` cho bullet và `1.` cho danh sách có thứ tự.
- Đặt tên kiểu, hàm, biến, keyword và đoạn syntax ngắn trong backtick.
- Fenced code phải ghi ngôn ngữ `cpp` và phải đóng fence.
- Không dùng HTML, heading bị bỏ cấp, heading in đậm thay cho `#`/`##`, hoặc
  heading không có ký hiệu Markdown.
- Không chép toàn bộ chương trình từ tệp `.cpp` vào Markdown.
- Không thêm lời chào, báo cáo compile, link tải hoặc ghi chú ngoài bài học vào
  bên trong tệp Markdown.
- Trước khi hoàn tất, tự kiểm tra rằng parser Markdown sẽ nhận được đúng một H1
  và đúng 11 H2 như skeleton.

## 6. Biên dịch và kiểm tra bắt buộc

1. Chọn một compiler C++ thật sự có trong môi trường, ưu tiên `g++`, sau đó mới
   đến `clang++`.
2. Chạy `[COMPILER] --version` và ghi lại phiên bản compiler thực tế.
3. Biên dịch với standard đúng phiên bản đã chọn và bật `-Wall -Wextra
   -Wpedantic`.
4. Chạy chương trình và kiểm tra output với dữ liệu cố định.
5. Sửa mọi compiler warning có thể sửa.
6. Kiểm tra lại tệp Markdown theo toàn bộ yêu cầu ở trên.
7. Nếu compiler không tồn tại hoặc không hỗ trợ tính năng cần dùng, hãy nói rõ
   bước nào không thể chạy và lý do. Không được giả vờ đã biên dịch thành công.

## 7. Báo cáo cuối

Sau bài giảng, chỉ báo cáo ngắn gọn:

- sách và chương/mục đã dùng;
- compiler và câu lệnh biên dịch chính xác;
- kết quả chạy chương trình;
- kết quả kiểm tra Markdown; và
- đúng hai liên kết tải trực tiếp, lần lượt cho tệp `.cpp` và `.md`.

Không tuyên bố thành công cho bước nào chưa thật sự chạy. Không thay hai liên kết
tải xuống bằng nội dung tệp dán trong cuộc trò chuyện.
````
