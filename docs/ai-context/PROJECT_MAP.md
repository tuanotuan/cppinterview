# Project map

Tài liệu ổn định để tìm đúng vùng code. Xác minh lại nếu source mới hơn.

## Cấu trúc repo

| Path | Vai trò |
|---|---|
| `cpp98_foundation/`, `cpp11/`, `cpp20/` | Lesson C++; mỗi thư mục bài có `knowledge.md`, thường có `main.cpp` |
| `python/` | Lesson Python; `knowledge.md` + tùy chọn `main.py` |
| `cmake/` | Source root được hỗ trợ; mỗi bài dùng `knowledge.md` + tùy chọn `CMakeLists.txt` |
| `web/` | App Recall: Next.js App Router, React, TypeScript |
| `web/content/` | Registry lesson và question YAML do Git quản lý |
| `web/src/generated/content-manifest.json` | Manifest deterministic, không sửa tay |
| `web/supabase/migrations/` | Schema/RPC/RLS theo thứ tự timestamp |
| `.github/workflows/web-validate.yml` | CI validate, refresh/sync/generate content |
| `AGENTS.md`, `AI_START_HERE.md` | Rule duy trì handoff và file định tuyến cho session mới |
| `docs/ai-context/GENERATED_SNAPSHOT.md` | Inventory/fingerprint deterministic do script sinh |

App phải ở `web/`; content tooling dựa vào vị trí này để tìm repo root.

## AI context maintenance

`web/scripts/generate-ai-context.ts` tính inventory và fingerprint từ lesson,
content, app source/test, scripts, package/env, workflow và Supabase. Chạy
`npm run context:refresh` sau mọi project change; `context:check` nằm trong
`validate`. Snapshot chỉ giữ facts máy tính được. Thay đổi semantic phải cập
nhật file context tương ứng theo root `AGENTS.md`.

## Runtime và entry points

| URL/vùng | Entry point | Chức năng |
|---|---|---|
| `/` | `web/src/app/page.tsx`, `practice-app.tsx` | Daily/custom study và Focus Sprint exact queue; answer, rating, scheduler, cloud sync và saved state |
| `/worldquant` | `worldquant/page.tsx`, `worldquant-readiness-app.tsx` | Readiness Hub theo role; Focus Sprint, targeted-mock CTA, account-scoped mock v4 gần nhất và comparable trend |
| `/mock-interview` | `mock-interview/page.tsx`, `mock-interview-app.tsx` | Interview Loop v4 balanced/targeted 30/45/60 phút, hidden execution, scoped debrief, history và remediation |
| `/learn/tick-data-order-book` | `learn/tick-data-order-book/page.tsx` | Guide tick data/order book |
| `/learn/cmake` | `learn/cmake/page.tsx`, `lib/learn/cmake-guide.ts` | Guide CMake target-based từ mental model tới CTest, packaging, CI và legacy migration |
| `/stats` | `stats/page.tsx` | Analytics học tập |
| `/admin` | `admin/page.tsx`, `admin-dashboard.tsx` | Review/edit/archive question, schedule, AI/job settings |
| `/auth/*` | `auth/{login,callback,logout}` | GitHub OAuth qua Supabase |

API quan trọng:

- `api/coach/{evaluate,follow-up}`: chấm và giải thích; OpenAI trước, Gemini
  fallback theo quota.
- `api/mock-interview/{run,report,history}`: chạy sample code, xác minh exact
  blueprint, tạo report có hidden evaluation và đọc/xóa history theo account.
- `api/progress/sync`: đồng bộ review/Anki state.
- `api/questions/approve`: duyệt đúng question version + source hash.
- `api/admin/{questions,question-state,ai-settings,generation-jobs}`: mutation
  owner-only.
- `api/admin/content-parity`: so Git manifest với DB trước cutover.

## Các domain trong `web/src/lib`

| Domain | File đầu mối | Trách nhiệm |
|---|---|---|
| `content` | `loader.ts`, `schema.ts`, `automation.ts` | Parse note, schema Zod, discover lesson, sinh manifest |
| `content` | `question-store-server.ts` | Chọn `repo`/`shadow`/`db`, parity, apply override |
| `practice` | `learning-state.ts`, `scheduler.ts`, `storage.ts` | Queue Anki, rating, due date, streak và browser progress store |
| `practice` | `focus-session.ts`, `focus-eligibility.ts` | Session Focus Sprint identity-only, resume/reconcile/completion và lọc exact approved refs |
| `practice` | `cloud-server.ts`, `cloud.ts` | Ghép auth, progress, approval, overrides, usage, manifest |
| `worldquant` | `readiness.ts`, `focus-plan.ts` | Role/competency model, preparation evidence và planner queue deterministic theo gap/time budget |
| `ai` | `openai.ts`, `gemini.ts`, `fallback.ts` | Provider calls và fallback |
| `ai` | `budget.ts`, `usage.ts`, `billing.ts` | Admission daily, accounting monthly, Costs API reconciliation |
| `mock-interview` | `catalog.ts`, `target-plan.ts`, `session-v4.ts`, `contracts-v4.ts` | Canonical competency mapping, deterministic balanced/targeted blueprint, account-scoped frozen session và exact API contract |
| `mock-interview` | `history.server.ts`, `trends.ts` | Lease/cache/idempotency cho report history và trend chỉ trên attempt comparable |
| `worldquant` | `mock-debrief.ts`, `mock-remediation.ts` | Role-scoped evidence, assessed/not-assessed matrix, deterministic ranked gaps và Focus remediation |
| `code-runner` | `admission.server.ts`, `execution-specs.server.ts`, `vercel-sandbox.server.ts` | Quota/idempotency, harness server-owned, VM cô lập |
| `supabase` | `server.ts`, `config.ts`, `authorization.ts` | SSR client và owner allowlist |
| `admin` | `dashboard.ts` | Tổng hợp dữ liệu admin |

Test nằm cạnh source dưới dạng `*.test.ts`. Khi sửa một domain, tìm test cùng
tên trước khi thêm test mới.

## Luồng dữ liệu chính

### Lesson đến practice

`knowledge.md`/code mẫu → `content/lesson-registry.yaml` →
`content:refresh`/loader → generated manifest → question store
(`repo`, `shadow`, hoặc `db`) → private overrides + approvals → practice deck.

Quy tắc:

- ID lesson ổn định; rename folder chỉ đổi `sourcePath`.
- Source hash đổi thì approval cũ mất hiệu lực và question thành
  `needs_review`.
- AI chỉ tạo `draft`; con người mới duyệt.
- Archive giữ history, không hard-delete question.
- Review được key theo question ID; queue/analytics tách theo deck.

### Practice state

Không có Supabase: localStorage và app vẫn dùng được. Có Supabase + đúng owner:
server tải review history, Anki projection, approvals, overrides và usage; browser
merge offline state rồi sync. RPC DB là nguồn thẩm quyền cho cloud transition.

### WorldQuant readiness

Question `verified` hoặc owner-approved hợp lệ → classifier taxonomy gán đúng một
competency → browser merge local/cloud progress → learning evidence theo Anki state
→ giới hạn hai card mỗi lesson → áp target và role weight. Hub tách `coverage`
(content bank đã kiểm chứng) khỏi `Preparation Index` (bằng chứng người học đã tích
lũy), nên thiếu content không bị diễn giải thành điểm yếu cá nhân. Mock report gần
nhất chỉ hiển thị riêng, chưa trộn vào index. Hub đọc history v4 theo account,
chỉ so trend cùng role/profile version, duration và evidence scope; mục
`not_assessed` không bị đổi thành điểm 0.

### WorldQuant Interview Loop v4

Catalog question đã duyệt + curated JD question → canonical competency →
deterministic blueprint theo role/mode/duration/variant → exact account-scoped
session. Submission đầu tiên được đóng băng cùng idempotency key; server dựng
lại blueprint và version trước runner/AI. Supabase giữ một token-scoped report
lease, trả cached artifact khi response trước bị mất, release retryable AI
failure và abort reservation khi hidden runner bắt buộc key mới. Targeted report
chỉ là evidence cho competency đã chọn; balanced cũng là sample trên phần trọng
số đã hỏi, không phải hiring/readiness verdict. Canonical debrief tạo remediation
từ assessed gap; AI text chỉ là nhận xét định tính.

### WorldQuant Focus Sprint

Hub dùng role weight, competency gap và Anki state để chốt một plan tối đa 110%
time budget. Plan chỉ chứa question identity/version/source hash/deck, giữ nguyên
thứ tự qua nhiều deck và chỉ lấy card `verified`/owner-approved. Hub ghi session
local trước khi hard-navigate tới Practice; Practice reconcile exact identity,
suspended và reviewed-today rồi dùng rating/scheduler/cloud path bình thường để
tiến queue. Session dùng optimistic revision check để tab cũ không phục hồi queue
đã tiến ở tab khác. Khi bank thiếu coverage, Hub mở guide thật hoặc báo content
gap/draft chờ owner review, không tạo queue giả.

### AI coach

Request được validate + rate-limit + auth/approval check → reserve daily OpenAI
web budget → gọi model → finalize usage → lưu attempt. Daily allowance chỉ tính
interactive web requests; Costs API toàn project và background generation chỉ
tham gia monthly accounting/hard-spend backstop. Khi daily/hard quota OpenAI
hết, Gemini có thể fallback nếu config và owner toggle cho phép. Múi giờ budget
là `Asia/Ho_Chi_Minh`.

### Code runner

Chỉ owner đã login; request bị giới hạn và bind vào set/question/spec revision.
Supabase RPC giữ quota, concurrency, idempotency. Candidate code chạy trong
fresh Vercel Sandbox snapshot không network; command/test harness do server giữ.
Hidden diagnostics/source không trả về browser. Infrastructure error không được
trừ điểm.

## Tech stack

- Node 22 trong CI; npm lockfile
- Next.js 16.2, React 19.2, TypeScript 5
- Vitest 4, ESLint 9, Tailwind 4
- Supabase SSR/Postgres/RLS
- OpenAI SDK, Google GenAI fallback
- Vercel Sandbox; Monaco editor
