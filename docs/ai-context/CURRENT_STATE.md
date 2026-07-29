# Current state

File này chỉ giữ việc đang bàn giao, giới hạn chưa xác minh và validation gần
nhất. Kiến trúc ổn định nằm trong `PROJECT_MAP.md`; command và invariant phát
triển nằm trong `DEVELOPMENT.md`; số liệu máy sinh nằm trong
`GENERATED_SNAPSHOT.md`. Luôn kiểm tra Git trực tiếp ở đầu session, không suy ra
trạng thái từ tên nhánh.

## Handoff hiện tại

- Không có task sản phẩm tiếp theo đã được chốt trong tài liệu. Session mới lấy
  yêu cầu hiện tại từ người dùng, rồi chỉ đọc thêm file context phù hợp.

## Giới hạn và trạng thái chưa xác minh

- Kho câu hỏi đã duyệt chưa bao phủ đều tick data, CMake, Python, Linux/mạng, hệ
  thống phân tán và kỹ năng chịu trách nhiệm đầu cuối. Giao diện phải gọi đây là
  “phần học liệu còn thiếu”, không diễn giải thành điểm yếu của người học khi
  chưa có bằng chứng.
- Guide `/learn/tick-data-order-book` vẫn còn, nhưng năm lesson tick tự tạo và
  sáu câu hỏi Git-owned phụ thuộc đã bị gỡ. Khi sync thực sự chạy, lesson và
  question repository-owned vắng manifest được chuyển sang `archived` mà không
  xóa revision/audit history. Ownership guard giữ lifecycle của row DB-owned;
  current-question view vẫn biểu diễn nó là `archived` khi lesson cha đã
  archive. Repo không chứng minh remote hiện có DB-owned draft nào.
- WorldQuant training state và Mission snapshot hiện ở localStorage schema/key
  v2, tách account/local và chưa cloud sync. Training state chỉ sao chép hợp lệ
  từ v1 sang v2 một chiều khi v2 chưa tồn tại; Mission v1 bị bỏ qua và dựng lại.
  Không tự gán dữ liệu local sang account sau khi đăng nhập.
- Hồ sơ phỏng vấn WorldQuant hiện hành là v4, danh mục bài luyện là v2. Bộ đọc
  chỉ giữ lịch sử tương thích theo các quy tắc version trong `DEVELOPMENT.md`;
  không khôi phục phiên cũ đang làm dở hoặc trộn phiên bản trong một vòng.
- Repo không chứng minh trạng thái deploy Vercel, `QUESTION_STORE` production,
  secret, quota hay migration remote. Đặc biệt Mock v4, Mistake Inbox và câu trả
  lời AI rỗng/dài cần lần lượt migration `20260730100000`,
  `20260730110000`, `20260730120000` cùng secret được mô tả trong
  `DEVELOPMENT.md`; file migration tồn tại không có nghĩa remote đã áp dụng.

## Hành vi cần giữ khi sửa tiếp

- Nội dung người dùng nhìn thấy dùng “bạn” hoặc câu trung tính theo
  `web/AGENTS.md`; không sửa máy móc câu hỏi đã duyệt mà bỏ qua version/hash.
- Câu trả lời trống nghĩa là chưa biết và vẫn gọi được AI. Luồng
  Trợ giúp → Làm lại khóa rating cho tới khi người học tự trả lời lại; retry và
  Recall Repair vẫn đi qua scheduler chuẩn, không tạo review trùng.
- Contribution graph `/profile` đọc review, coach attempt và mock attempt đã
  hoàn tất qua RLS; không gọi AI, không tạo bảng activity và không trừ quota.
- WorldQuant coverage, learning evidence và mock evidence là ba tín hiệu khác
  nhau. Draft, personal remediation hoặc content gap không được biến thành điểm
  yếu hay bằng chứng đã xác nhận.

## Validation gần nhất

- `npm run validate` đạt toàn bộ: content/context check, lint, TypeScript,
  Vitest và production build.
- Vitest: 73 test files, 422 tests đạt.
- Next.js production build đạt; route graph gồm `/profile`, năm route
  WorldQuant training và `/admin/coverage`.
- Lần smoke production gần nhất dùng Chrome 1440×1200 và mobile CDP 390×844:
  Practice, WorldQuant, guide CMake/tick và Full Round không tràn ngang ở cấp
  trang. Đây không phải bằng chứng deployment hiện tại đang hoạt động.

## Quy tắc cập nhật

Thay fact cũ thay vì nối changelog. Chỉ giữ task, blocker, giới hạn hoặc kết quả
validation có ích cho session kế tiếp; fact đếm được phải nằm trong generator.
