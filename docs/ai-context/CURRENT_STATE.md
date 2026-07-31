# Current state

File này chỉ giữ việc đang bàn giao, giới hạn chưa xác minh và validation gần
nhất. Kiến trúc ổn định nằm trong `PROJECT_MAP.md`; command và invariant phát
triển nằm trong `DEVELOPMENT.md`; số liệu máy sinh nằm trong
`GENERATED_SNAPSHOT.md`. Luôn kiểm tra Git trực tiếp ở đầu session, không suy ra
trạng thái từ tên nhánh.

## Handoff hiện tại

- Đợt rà soát bug tiềm ẩn đã gia cố auth owner, account-scoped browser state,
  phân trang lịch sử, AI budget/retry, Coach idempotency, Mock report, Mistake
  generation, rating nhiều tab/thiết bị, content archive, dependency production
  và quyền CI. Hai lesson `cpp11-toolchain` và
  `cpp11-const-pointer-lvalue-reference` đã được đăng ký cùng ví dụ C++11 có
  warning sạch. Prompt `docs/prompts/cpp-daily-lesson.md` dành riêng cho GPT Web:
  tra nguồn trong Google Drive rồi tạo đúng hai tệp tải xuống có format lesson
  chuẩn. Việc đưa tệp vào repo, refresh, kiểm tra và push là workflow riêng.
  Không có task sản phẩm tiếp theo đã được chốt; session mới lấy yêu cầu hiện tại
  từ người dùng.
- Bộ tính chi phí AI dùng giá GPT-5.6 hiện hành: Luna $0.20 input/$1.20 output
  mỗi triệu token, Terra $2/$12. Ngân sách ứng dụng mặc định vẫn là $5/tháng;
  reservation đã giảm tương ứng để cùng ngân sách cho phép nhiều lượt hơn.

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
- Hồ sơ phỏng vấn WorldQuant hiện hành là v4, local snapshot nằm dưới exact
  account UUID và danh mục bài luyện là v2. Mọi transition dùng Web Lock +
  revision CAS; answer intent chỉ được rebase trong cùng session/status, còn
  freeze/complete/reset giữ CAS nghiêm ngặt. Phiên đúng owner nhưng stale theo
  question revision được thay nguyên tử khi tạo buổi mới. Hub chỉ đọc local v4
  theo account hoặc server history v4; không nhận shared v3/ownerless state.
- Repo không chứng minh trạng thái deploy Vercel, `QUESTION_STORE` production,
  secret, quota hay migration remote. Bản code này cần áp dụng các migration
  `20260730130000`–`20260730170000` và
  `20260730190000`–`20260730220000` theo timestamp. Migration budget khóa các
  RPC hạn mức tổng hợp cũ. Thứ tự rollout bắt buộc là app/worker mới trước,
  migration sau; không chạy riêng protocol-breaking
  `20260730140000`/`20260730170000`/`20260730210000` khi phiên bản cũ còn phục
  vụ. Practice dùng expand `20260730200000` giữ RPC năm tham số tạm thời, rồi
  finalize `20260730220000` mới backfill generation và gỡ overload sau khi app
  generation-aware đã phục vụ. Các migration mới chưa được chạy integration
  trên PostgreSQL thật trong môi trường local.
- Main workflow serialize content generation và sync exact generator version.
  Không chạy đồng thời worker service-role từ hai bản deploy. Conflict giữa các
  version phải được đóng rõ trong Admin của bản hiện hành; outcome AI chưa xác
  định vẫn cần xác nhận riêng trước khi mở lại hoặc đóng row.
- Hàm content backfill legacy từng có thể cấp `content_admins` từ
  `raw_user_meta_data`; migration mới thay thân hàm bằng lỗi SQLSTATE `55000` và
  thu hồi mọi quyền gọi, nhưng không thể xác minh dữ liệu remote. Khi deploy cần
  kiểm tra membership hiện hữu trong `content_admins` và xóa row không thuộc
  owner bằng quy trình vận hành có audit.

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
- Vitest: 95 test files, 607 tests đạt.
- Next.js production build đạt và sinh đủ 25 trang tĩnh/động trong route graph,
  gồm `/profile`, năm route WorldQuant training và `/admin/coverage`.
- `npm audit --omit=dev --audit-level=moderate` không tìm thấy lỗ hổng production.
  Audit gồm dev dependency còn 9 cảnh báo mức cao trong chuỗi công cụ ESLint
  (`minimatch`/`brace-expansion`); cách sửa tự động hiện yêu cầu nâng cưỡng bức lên
  ESLint 10, không tương thích bộ Next.js hiện dùng. Các gói này không nằm trong
  dependency production, nên giữ cảnh báo này được ghi nhận thay vì phá vỡ lint.
- Lần smoke production gần nhất dùng Chrome 1440×1200 và mobile CDP 390×844:
  Practice, WorldQuant, guide CMake/tick và Full Round không tràn ngang ở cấp
  trang. Đây không phải bằng chứng deployment hiện tại đang hoạt động.

## Quy tắc cập nhật

Thay fact cũ thay vì nối changelog. Chỉ giữ task, blocker, giới hạn hoặc kết quả
validation có ích cho session kế tiếp; fact đếm được phải nằm trong generator.
