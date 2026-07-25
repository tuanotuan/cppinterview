# Current state

Snapshot này được lập ngày **2026-07-25 (Asia/Saigon)**. Luôn xác minh bằng Git
và source hiện tại trước khi hành động.

## Git snapshot trước khi thêm handoff docs

- Repo: `https://github.com/tuanotuan/modern-cpp-features.git`
- HEAD: `414d10b` — merge PR #57, `fix(ai): reset OpenAI admission daily`
- Branch checkout: `fix/ai-quota-two-request-drain`
- `main` và `origin/main` cũng ở đúng `414d10b`.
- Branch checkout chưa có commit riêng và worktree sạch trước khi tạo bộ
  Markdown này. Vì vậy **không được suy ra** yêu cầu của fix
  `ai-quota-two-request-drain` chỉ từ tên branch.
- Sau tác vụ tài liệu này, các file handoff mới là thay đổi dự kiến chưa commit.

## Content snapshot

- Generated manifest: schema 1, 34 lessons, 48 questions.
- Lessons: C++98 = 5, C++11 = 22, C++20 = 6, Python 3 = 1.
- Questions: 10 `verified`, 38 `draft`; cả 48 hiện thuộc deck
  `cpp-interview`.
- Source revision trong manifest:
  `269db959cf2280941c07c3b96e39487c730c5b2bc6588808c858cd7cfe8b62c6`.
- `web/README.md` nói “22 lessons”; con số này đã cũ so với manifest.
- Python lesson đã tồn tại nhưng chưa có question trong generated Git bank.
- CMake được hỗ trợ và deck đang enabled trong code, nhưng snapshot chưa có
  thư mục `cmake/` hay lesson CMake.

Các số trên chỉ để định hướng. Khi cần số chính xác, parse
`web/src/generated/content-manifest.json`.

## Tính năng gần nhất đã merge

Theo 15 commit gần nhất:

- Reset OpenAI admission đúng ngày mới và ưu tiên question New.
- Guide tick-data/order-book và curriculum C++20 gồm parsing, MBO, MBP,
  sequencing/recovery, trade statistics/timestamp/corrections.
- Mock-interview code chạy trong isolated Vercel Sandbox.
- Ẩn set hints/format metadata của mock interview.
- WorldQuant tick-data engineering mock interview versioned.

## Trạng thái kiến trúc đáng chú ý

- App có ba deck được enable: C++, Python, CMake.
- Git source lesson → deterministic manifest; production có pipeline sync DB và
  DB-native AI drafts.
- Practice offline-first; Supabase/GitHub OAuth là optional cho cloud.
- AI coach dùng OpenAI Luna/Terra theo tác vụ, Gemini free fallback khi quota
  phù hợp; budget day theo giờ Việt Nam.
- Mock code runner cần migration admission, snapshot immutable và dedicated
  Supabase secret key; mặc định env example để disabled.

## Chưa được xác nhận

- Không có yêu cầu/task spec cho branch `fix/ai-quota-two-request-drain`.
- Snapshot tài liệu không biết trạng thái deploy Vercel, migration đã apply tới
  đâu, `QUESTION_STORE` production hay secret thực tế. Phải kiểm tra external
  environment khi user yêu cầu, không suy đoán từ repo.
- Không coi các dòng TODO/FIXME là backlog chính thức nếu chưa có issue/yêu cầu.

## Validation của handoff

- `git diff --check`: pass.
- Link từ `AI_START_HERE.md` tới ba file context: tồn tại.
- Chưa chạy được `npm run validate`: máy hiện tại không tìm thấy `node`/`npm`
  trong `PATH`, dù `web/node_modules` đã tồn tại. Đây không phải test failure của
  source; session sau cần chạy lại khi Node 22 khả dụng.

## Cách cập nhật file này

Sau feature/fix lớn, thay:

1. ngày, branch, HEAD và worktree;
2. content counts nếu manifest đổi;
3. “tính năng gần nhất” và blocker/task dở;
4. command validation cuối cùng và kết quả.

Xóa trạng thái đã hết giá trị thay vì nối log dài. File này phải là snapshot,
không phải changelog.
