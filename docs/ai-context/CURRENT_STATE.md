# Current state

File này chỉ giữ trạng thái semantic không thể sinh chắc chắn từ source. Số liệu
content, route, dependency, migration và fingerprint mới nhất nằm trong
`GENERATED_SNAPSHOT.md`. Branch, HEAD và worktree phải kiểm tra trực tiếp bằng
Git ở đầu mỗi session; không lưu chúng tại đây vì sẽ lỗi thời sau mỗi commit.

## Tính năng gần đây đáng biết

- `/profile` là trang cá nhân owner-private với contribution graph 53 tuần theo
  ngày Việt Nam. Mỗi lượt ôn thẻ, AI coach và phỏng vấn thử hoàn tất là một hoạt
  động riêng; tooltip tách từng loại, còn summary hiển thị active days và chuỗi
  hiện tại/dài nhất. Trang đọc các bảng RLS hiện hữu theo từng page, không cần
  migration, không gọi AI và không trừ quota.
- Quy ước nội dung người dùng nhìn thấy nằm ở `web/AGENTS.md`; giao diện công
  khai, thông báo API và phản hồi AI dùng “bạn” hoặc câu trung tính, chỉ giữ
  thuật ngữ chuẩn khi cần. `user-facing-language.test.ts` chặn đại từ suồng sã
  và các nhãn cũ đã được chuẩn hóa.
- `/worldquant` là Trung tâm chuẩn bị dùng được cả khi chỉ lưu trên thiết bị:
  bốn hồ sơ vị trí C++, mười năng lực ổn định và Chế độ hướng dẫn làm lối vào
  mặc định. Header chỉ giữ Hôm nay/Luyện thẻ/Cách dùng; phần giới thiệu lần đầu
  và một nút tạo Nhiệm vụ đúng vị trí/thời lượng, còn thống kê/công cụ chuyên sâu
  nằm trong mục Nâng cao.
  Khi đã login và cấu hình history, Hub vẫn hiển thị mock v4 mới nhất theo role,
  assessed/not-assessed matrix, comparable trend và CTA targeted mock theo gap.
  `Preparation Index` và mock evidence luôn tách rời; cả hai không phải xác suất
  đậu.
- WorldQuant training loop đã có đủ các route:
  `/worldquant/curriculum` (30 concept/prerequisite),
  `/worldquant/drills` (30 scenario: một practice + hai checkpoint mỗi competency),
  `/worldquant/mission` (daily queue có time budget và mock history thật),
  `/worldquant/full-round` (5 timed round + English Voice) và
  `/admin/coverage` (editorial priority). Gap đi theo
  `open → learning → transfer_ready → verified`; checkpoint clean phải đạt
  rubric/follow-up và là unseen hoặc spaced retest sau cooldown 24 giờ mới verify.
- Hồ sơ phỏng vấn WorldQuant hiện ở phiên bản 4 và danh mục bài luyện ở phiên
  bản 2. Vì bản 2 chỉ viết lại ngôn ngữ mà không đổi cấu trúc đánh giá, lượt
  làm, lần mở bài kiểm tra và kết quả vòng phỏng vấn bản 1 vẫn được giữ làm lịch
  sử. Lượt hoàn tất mới, bằng chứng cập nhật điểm cần cải thiện và thống kê xếp
  bài luyện phải dùng đúng bản 2 hiện hành. Một vòng phỏng vấn cũ chỉ hợp lệ khi
  mọi chặng cùng dùng một phiên bản danh mục; không trộn bản 1 với bản 2. Phiên
  bản khóa và cấu trúc lưu trên trình duyệt là 2; khi chưa có khóa bản 2, ứng
  dụng sao chép một chiều lịch sử từ khóa bản 1 và không xóa hoặc ghi lại khóa
  cũ, nên tab ứng dụng cũ không thể ghi đè dữ liệu mới.
- Practice có same-session Recall Repair: `Again` quay lại sau 3 thẻ, `Hard`
  sau 5 thẻ; retry không tạo daily review thứ hai. Practice không còn hỏi mức tự
  tin hoặc hiển thị confidence calibration. Draft answer/code không có giới hạn
  ký tự ở tầng sản phẩm; để trống nghĩa là chưa biết, nút AI vẫn hoạt động và
  prompt buộc coach dạy từ nền tảng. Blank attempt đi vào Rescue, ẩn điểm/rating
  và yêu cầu tự làm lại; AI chấm Retry lần hai, đạt thì tiếp tục bằng
  `Good`/`Easy`, chưa đạt thì vào Recall Repair bằng `Again`/`Hard`. Phase này
  cùng cờ hint/reveal/coach giữ qua navigation/reload tới khi card được hoàn tất.
  Stats chỉ giữ FSRS-6 shadow theo exact revision và không đổi lịch hiện tại.
- Today’s Mission khóa exact snapshot qua reload theo account/local + ngày + role
  + budget, đưa duy nhất item chưa xong đầu tiên lên “Bước tiếp theo” và return
  về đúng Mission sau Focus/Drill/Mock. Snapshot dùng schema/key v2, giữ tối đa
  24 bản/account và rebuild khi question/drill revision,
  competency/canonical-content truth stale hoặc mock history không khả dụng;
  bản v1 bị bỏ qua để dựng lại và không bị đọc, di chuyển hay xóa. Local mode
  không xếp mock cần durable history.
  Phần học liệu còn thiếu được báo là giới hạn của kho câu hỏi, không làm Nhiệm
  vụ báo hoàn tất. Training, repair và
  signal writes dùng Web Locks khi browser hỗ trợ để tránh hai tab ghi đè nhau.
- Full Round không lưu/upload audio hoặc answer. Transcript chỉ ở memory của tab,
  bị xóa sau khi summary lưu thành công; timer khóa input tại deadline và WPM chỉ
  tính thời gian mic cùng voice transcript thật. Năm scenario không dùng lại
  checkpoint certification; training state chỉ giữ summary số cùng exact
  role/full-round/drill revision. Các state training mới
  hiện là localStorage versioned theo account/local mode, chưa cloud sync và
  không tự chuyển local state sang account sau login. Hub vẫn đọc kết quả hoàn
  tất của hồ sơ phỏng vấn bản 3 để hiển thị riêng, nhưng không khôi phục phiên
  đang làm dở từ bản cũ.
- Focus Sprint chốt exact approved queue theo role/gap/Anki state và time budget,
  hỗ trợ pause/resume/completion qua nhiều deck. Practice không replan; mỗi rating
  vẫn cập nhật scheduler/cloud bình thường. Guided return chỉ mang marker, role
  và budget đã validate, không nhận arbitrary URL. Session local có reconcile
  stale và optimistic revision check để tab cũ không ghi đè queue mới.
- Readiness tách content coverage khỏi learning progress, chỉ nhận question
  `verified`/owner-approved và cap hai card mỗi lesson để tránh coverage bị thổi
  phồng. Draft chờ duyệt được báo riêng cho owner, không đi vào Focus/Preparation
  Index. Mock v3 legacy vẫn được giữ nguyên trong key localStorage cũ và không tự
  gán sang account. Interview Loop v4 dùng key theo account, exact balanced hoặc
  targeted blueprint, frozen report submission, durable history/cache và scoped
  canonical debrief; targeted không phát readiness verdict.
- AI admission reset theo ngày Việt Nam và practice ưu tiên question New.
- Tiêu đề question trong practice tự giảm cỡ chữ theo độ dài; câu ngắn giữ cỡ
  nổi bật, câu dài dùng typography gọn và line-height thoáng hơn.
- Guide độc lập `/learn/tick-data-order-book` vẫn còn làm tài liệu tham khảo.
  Năm lesson tự tạo `cpp20/02_...` đến `cpp20/06_...` và sáu question Git-owned
  phụ thuộc các lesson đó đã bị gỡ theo yêu cầu; pipeline sync sẽ archive lesson,
  question và mọi draft DB-native liên quan thay vì hard-delete audit history.
- Guide `/learn/cmake` có 16 chương target-based, dùng một TickPlatform xuyên
  suốt từ mental model, code generation và CTest tới packaging, CI và migration
  legacy; baseline thực hành là CMake 3.25.
- Mock interview WorldQuant có deterministic role blueprint, hidden code runner
  trong isolated Vercel Sandbox, deterministic remediation và history delete.
- App hỗ trợ deck C++, Python và CMake; số lesson/question hiện hữu xem generated
  snapshot, không suy từ việc deck đã enable.
- Git giữ lesson source; production có pipeline sync derived snapshot và tạo
  DB-native question drafts trong Supabase.
- Mistake Inbox biến lỗi durable từ AI Coach và Mock v4 thành draft flashcard có
  nguồn, review gate, dedupe, retry/recovery và ưu tiên Anki New. Card sửa lỗi cá
  nhân không làm phồng WorldQuant content coverage.

## Giới hạn chưa thể suy ra từ repo

- Không có task spec chỉ vì tên branch trông giống một feature/fix.
- Repo không chứng minh trạng thái deploy Vercel, migration remote đã apply tới
  đâu, `QUESTION_STORE` production, secret hay quota thực tế.
- Phải kiểm tra external environment khi user yêu cầu; không suy đoán từ
  `.env.example`, migration tồn tại hay workflow.

## Task/handoff hiện tại

- Mô hình WorldQuant nằm ở `web/src/lib/worldquant/readiness.ts`; transfer loop
  nằm ở `curriculum.ts`, `drills.ts`, `gap-closure.ts`, `mission.ts` và
  `training-state.ts`; Guided onboarding/return/next-step nằm ở `guided-mode.ts`.
  Focus session cũ vẫn ở `practice/focus-session.ts`;
  same-session retry ở `practice/repair-queue.ts`. Route server chỉ truyền dữ
  liệu serializable; analytics/training state không lưu candidate answer.
- Kho câu hỏi hiện chưa bao phủ đều dữ liệu tick, CMake, Python, Linux/mạng,
  distributed systems và ownership. Tick drafts mới không thay đổi coverage cho
  tới khi owner duyệt. Giao diện phải mô tả đây là “phần học liệu còn thiếu”;
  chỉ giữ enum nội bộ `content_gap`, không biến nó thành đánh giá người học yếu
  khi chưa có bằng chứng đã kiểm chứng.
- Migration `20260730100000_create_mock_interview_attempts.sql` và secret
  `MOCK_HISTORY_SUPABASE_SECRET_KEY` phải được cấu hình trước khi bắt đầu mock
  v4; report fail closed trước runner/AI nếu không giữ được reservation. Migration
  chưa được repo tự động apply vào remote chỉ vì file tồn tại.
- Migration `20260730110000_create_mistake_flashcard_queue.sql` phải được apply
  trước khi dùng Mistake Inbox; practice/report fail-soft còn Admin báo migration
  bị thiếu.
- Migration `20260730120000_allow_blank_unbounded_coach_answers.sql` phải được
  apply để `coach_attempts` lưu được answer rỗng hoặc dài; file tồn tại không
  chứng minh remote database đã chạy migration.

## Validation gần nhất

- `npm run validate` pass toàn bộ: content/context check, lint, TypeScript,
  Vitest và production build.
- Vitest: 73 test files, 422 tests pass.
- Next.js production build: pass, gồm compile, type-check; `/profile`, năm route
  WorldQuant training và `/admin/coverage` đều có trong route graph.
- Headless Chrome production smoke ở 1440×1200 và mobile CDP 390×844: trang
  luyện thẻ, Trung tâm chuẩn bị, hướng dẫn CMake, hướng dẫn dữ liệu tick và Full
  Round hiển thị đúng bố cục; không có tràn ngang ở cấp trang. Các trạng thái
  thiếu cấu hình Supabase của Mock/Stats/Admin cũng dùng câu tiếng Việt rõ ràng.

## Quy tắc cập nhật

Thay nội dung hiện tại, không nối changelog. Chỉ ghi blocker, quyết định, giới
hạn hoặc task dở có ích cho session kế tiếp. Các facts có thể tính từ repo phải
được thêm vào generator thay vì chép tay vào đây.
