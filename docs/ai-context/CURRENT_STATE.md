# Current state

File này chỉ giữ trạng thái semantic không thể sinh chắc chắn từ source. Số liệu
content, route, dependency, migration và fingerprint mới nhất nằm trong
`GENERATED_SNAPSHOT.md`. Branch, HEAD và worktree phải kiểm tra trực tiếp bằng
Git ở đầu mỗi session; không lưu chúng tại đây vì sẽ lỗi thời sau mỗi commit.

## Tính năng gần đây đáng biết

- `/worldquant` là Readiness Hub dùng được cả local mode: bốn role profile C++,
  mười competency ổn định, target-date planner, daily queue và mock report gần
  nhất. `Preparation Index` chỉ là bằng chứng trong app, không phải xác suất đậu.
- Readiness tách content coverage khỏi learning progress, chỉ nhận question
  `verified`/owner-approved và cap hai card mỗi lesson để tránh coverage bị thổi
  phồng. Mock v3 vẫn chỉ có một report gần nhất, chưa account-scope trong
  localStorage và chưa được cộng vào index.
- AI admission reset theo ngày Việt Nam và practice ưu tiên question New.
- Tiêu đề question trong practice tự giảm cỡ chữ theo độ dài; câu ngắn giữ cỡ
  nổi bật, câu dài dùng typography gọn và line-height thoáng hơn.
- Curriculum/guide tick-data và order-book đã có trong C++20.
- Guide `/learn/cmake` có 16 chương target-based, dùng một TickPlatform xuyên
  suốt từ mental model, code generation và CTest tới packaging, CI và migration
  legacy; baseline thực hành là CMake 3.25.
- Mock interview WorldQuant có bộ đề versioned và code runner dùng isolated
  Vercel Sandbox.
- App hỗ trợ deck C++, Python và CMake; số lesson/question hiện hữu xem generated
  snapshot, không suy từ việc deck đã enable.
- Git giữ lesson source; production có pipeline sync derived snapshot và tạo
  DB-native question drafts trong Supabase.

## Giới hạn chưa thể suy ra từ repo

- Không có task spec chỉ vì tên branch trông giống một feature/fix.
- Repo không chứng minh trạng thái deploy Vercel, migration remote đã apply tới
  đâu, `QUESTION_STORE` production, secret hay quota thực tế.
- Phải kiểm tra external environment khi user yêu cầu; không suy đoán từ
  `.env.example`, migration tồn tại hay workflow.

## Task/handoff hiện tại

- Mô hình WorldQuant nằm ở `web/src/lib/worldquant/readiness.ts`; route server chỉ
  truyền question summary serializable, client đọc localStorage rồi merge cloud
  read-only. Khi thêm content, giữ taxonomy đủ rõ để classifier không phải đọc
  prompt/answer.
- Question bank hiện chưa bao phủ đều Tick, CMake, Python, Linux/networking,
  distributed systems và ownership. Hub phải tiếp tục gọi đây là `content gap`;
  không đổi thành đánh giá người học yếu cho tới khi có evidence đã kiểm chứng.

## Validation gần nhất

- Content check, context refresh/check và `git diff --check`: pass.
- Lint toàn repo và TypeScript `--noEmit`: pass.
- Vitest: 44 test files, 213 tests pass.
- Next.js production build: pass, gồm compile, type-check và 19 generated pages;
  `/worldquant` là dynamic route, hai learning guide được prerender static.

## Quy tắc cập nhật

Thay nội dung hiện tại, không nối changelog. Chỉ ghi blocker, quyết định, giới
hạn hoặc task dở có ích cho session kế tiếp. Các facts có thể tính từ repo phải
được thêm vào generator thay vì chép tay vào đây.
