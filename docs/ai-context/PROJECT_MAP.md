# Project map

Tài liệu ổn định để tìm đúng vùng code. Xác minh lại nếu source mới hơn.

## Cấu trúc repo

| Path | Vai trò |
|---|---|
| `cpp98_foundation/`, `cpp11/`, `cpp20/` | Lesson C++; mỗi thư mục bài có `knowledge.md`, thường có `main.cpp` |
| `python/` | Lesson Python; `knowledge.md` + tùy chọn `main.py` |
| `cmake/` | Source root tùy chọn đã được pipeline hỗ trợ nhưng hiện chưa có lesson tracked; mỗi bài dùng `knowledge.md` + tùy chọn `CMakeLists.txt` |
| `web/` | App Recall: Next.js App Router, React, TypeScript |
| `web/src/proxy.ts` | Entry point refresh cookie/session Supabase qua `lib/supabase/proxy.ts` |
| `web/src/app/recall-mobile-nav.tsx` | Điều hướng mobile dùng chung: Học hôm nay, Nhiệm vụ, Trung tâm chuẩn bị, Thư viện, Hồ sơ; tự ẩn ở mock/full-round để giữ không gian phỏng vấn |
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
| `/` | `web/src/app/page.tsx`, `practice-app.tsx`, `question-editor-dialog.tsx`, `confirmation-dialog.tsx` | Today workspace là entry point: CTA tiếp tục/luyện thêm, tiến độ và chỉ số ngày trước card; Daily/custom study và Focus Sprint exact queue; answer không giới hạn sản phẩm, blank = chưa biết và vẫn gọi được AI, rating, scheduler, cloud sync, saved state, owner-only edit/archive thẻ và return về Guided Mission; thao tác phá hủy dùng confirmation sheet của Recall thay vì hộp thoại trình duyệt |
| `/worldquant` | `worldquant/page.tsx`, `worldquant-readiness-app.tsx` | Trung tâm chuẩn bị theo vị trí/thời lượng, giới thiệu lần đầu, mục Nâng cao thu gọn; thống kê, Phiên ôn tập trọng tâm, phỏng vấn thử v4 gần nhất và xu hướng có thể so sánh |
| `/worldquant/curriculum` | `worldquant/curriculum/page.tsx` | Graph 30 concept theo prerequisite; tách card coverage, pending content và transfer drill |
| `/worldquant/drills` | `worldquant/drills/page.tsx`, `worldquant-drill-app.tsx` | Bài luyện tình huống: thẻ khởi động đã duyệt → luyện tập → câu hỏi tiếp nối → tiêu chí chấm → bài kiểm tra xác nhận mới/cách quãng; giữ đúng đường về Nhiệm vụ |
| `/worldquant/mission` | `worldquant/mission/page.tsx`, `worldquant-mission-app.tsx` | Nhiệm vụ hằng ngày xác định, nêu một bước tiếp theo và giữ đúng đường về qua thẻ/bài luyện/phỏng vấn thử |
| `/worldquant/full-round` | `worldquant/full-round/page.tsx`, `worldquant-full-round-app.tsx` | Năm non-certification round có hard deadline, rubric và English Web Speech tùy chọn; không lưu answer/audio |
| `/worldquant/tick-replay-lab` | `worldquant/tick-replay-lab/page.tsx` | Mô phỏng chuỗi tick, recovery và kiểm tra bất biến sổ lệnh bằng kịch bản xác định |
| `/worldquant/toolchain-dojo` | `worldquant/toolchain-dojo/page.tsx` | Năm bài CMake/C++ target-based tuần tự: scope, public/private, CTest, sanitizer và CI |
| `/worldquant/legacy-modern-capstone` | `worldquant/legacy-modern-capstone/page.tsx` | Sáu checkpoint quyết định an toàn khi chuyển nền tảng tick data cũ sang modern C++ |
| `/learn` | `learn/page.tsx`, `learn/[lessonId]/page.tsx` | Thư viện lesson từ manifest, Markdown an toàn, tự kiểm tra và mở phiên ôn tập trọng tâm |
| `/mock-interview` | `mock-interview/page.tsx`, `mock-interview-app.tsx` | Phỏng vấn thử v4 toàn diện/trọng tâm 30/45/60 phút, kiểm thử ẩn, tổng kết đúng phạm vi, lịch sử và kế hoạch ôn tiếp; desktop session rail chỉ lộ thứ tự/trạng thái trả lời, còn thanh chuyển câu/nộp bài sticky; nộp sớm, reset, thay Focus hoặc xóa history đều xác nhận trong UI |
| `/learn/tick-data-order-book` | `learn/tick-data-order-book/page.tsx`, `lib/learn/tick-data-guide.ts` | Guide tick data/order book |
| `/learn/cmake` | `learn/cmake/page.tsx`, `lib/learn/cmake-guide.ts` | Guide CMake target-based từ mental model tới CTest, packaging, CI và legacy migration |
| `/stats` | `stats/page.tsx`, `fsrs-shadow-panel.tsx` | Analytics học tập và FSRS-6 shadow comparison |
| `/profile` | `profile/page.tsx`, `lib/profile/{contribution-activity,profile-activity.server}.ts` | Trang cá nhân và contribution graph 53 tuần từ lượt ôn, AI coach và phỏng vấn thử đã hoàn tất |
| `/admin` | `admin/page.tsx`, `admin-dashboard.tsx`, `input-dialog.tsx` | Review/edit/archive question, schedule, AI/job settings; xác nhận/ràng buộc nguồn của mistake card dùng sheet/form trong UI thay vì API dialog của trình duyệt |
| `/admin/coverage` | `admin/coverage/page.tsx` | Mức bao phủ nội dung, ưu tiên phần học liệu còn thiếu theo khái niệm và loại bằng chứng |
| `/auth/*` | `auth/{login,callback,logout}` | GitHub OAuth qua Supabase |

API quan trọng:

- `api/coach/{evaluate,follow-up}`: chấm và giải thích; OpenAI trước, Gemini
  fallback theo quota.
- `api/mock-interview/{run,report,history}`: chạy sample code, xác minh exact
  blueprint, tạo report có hidden evaluation và đọc/xóa history theo account.
- `api/progress/sync`: đồng bộ review/Anki state.
- `api/worldquant/{training-state,mission-snapshot}`: đọc/ghi state WorldQuant
  account-scoped bằng revision CAS; browser fallback về local khi API/database chưa sẵn sàng.
- `api/mistakes/{generate,preferences,resolve,ground,backfill}`: Mistake Inbox
  owner-private, grounded card generation và recovery từ Mock v4.
- `api/questions/approve`: duyệt đúng question version + source hash.
- `api/admin/{questions,question-state,ai-settings,generation-jobs}`: mutation
  owner-only.
- `api/admin/content-parity`: so Git manifest với DB trước cutover.

## Các domain trong `web/src/lib`

| Domain | File đầu mối | Trách nhiệm |
|---|---|---|
| `content` | `loader.ts`, `schema.ts`, `automation.ts` | Parse note, schema Zod, discover lesson, sinh manifest |
| `content` | `question-store-server.ts` | Chọn `repo`/`shadow`/`db`, parity, apply override |
| `practice` | `learning-state.ts`, `scheduler.ts`, `storage.ts`, `progress-sync.ts`, `study-session.ts` | Queue Anki, rating nguyên tử, due date, streak, browser/cloud progress và draft/phase Trợ giúp → Làm lại |
| `practice` | `repair-queue.ts`, `rescue-retry.ts`, `fsrs-shadow.ts`, `browser-storage-lock.ts` | Blank-answer Rescue → Retry, same-session repair exact identity, cross-tab mutation lock và FSRS-6 chỉ quan sát |
| `practice` | `focus-session.ts`, `focus-eligibility.ts` | Session Focus Sprint identity-only, resume/reconcile/completion và lọc exact approved refs |
| `practice` | `cloud-server.ts`, `cloud.ts`, `practice-review-reader.server.ts`, `question-learning-state-reader.server.ts` | Ghép auth, đọc review trước/state generation sau với fallback migration hẹp, approval, overrides, usage và manifest |
| `practice` | `mistake-cards.ts`, `mistake-cards.server.ts` | Capture lỗi durable, dedupe, grounded generation và materialize draft |
| `worldquant` | `readiness.ts`, `focus-plan.ts` | Role/competency model, preparation evidence và planner queue deterministic theo gap/time budget |
| `worldquant` | `curriculum.ts`, `curriculum-evidence.ts`, `drills.ts` | Concept graph, content/transfer coverage và catalog 30 scenario: một practice + hai checkpoint mỗi competency |
| `worldquant` | `training-state.ts`, `mission-snapshot.ts`, `tick-replay.ts`, `toolchain-dojo.ts`, `legacy-modern-capstone.ts` | Evidence account-scoped, cloud CAS/local fallback, Mission frozen, mô phỏng tick, bài thực hành CMake và capstone chuyển đổi legacy |
| `ai` | `openai.ts`, `gemini.ts`, `fallback.ts`, `access.ts` | Provider call không transport retry, fallback và chặn AI không quota ngoài local development; Luna cho học tập/Coach, Terra chỉ cho report Mock |
| `ai` | `budget.ts`, `usage.ts`, `billing.ts`, `coach-idempotency-client.ts`, `coach-reservation.server.ts`, `coach-follow-up-reservation.server.ts` | Sổ hạn mức UUID, phân loại kết quả provider và terminal cache Coach theo exact request |
| `mock-interview` | `profile.ts`, `profile-server.ts`, `catalog.ts`, `target-plan.ts` | JD question/version grounding, canonical competency mapping và deterministic balanced/targeted blueprint |
| `mock-interview` | `session-v4.ts`, `contracts-v4.ts`, `session.ts`, `contracts.ts` | Account-scoped frozen v4 session/API contract, owner check và revision CAS; legacy parser không cấp dữ liệu cho Hub |
| `mock-interview` | `history.server.ts`, `report-submission-client.ts`, `trends.ts` | Lease/cache/idempotency cho report, chống stale cross-tab submission và trend chỉ trên attempt comparable |
| `worldquant` | `mock-debrief.ts`, `mock-remediation.ts` | Role-scoped evidence, assessed/not-assessed matrix, deterministic ranked gaps và Focus remediation |
| `worldquant` | `hub-preferences.ts` | Preference của Readiness Hub tách theo account/local và đồng bộ giữa tab cùng scope |
| `code-runner` | `admission.server.ts`, `execution-specs.server.ts`, `vercel-sandbox.server.ts` | Quota/idempotency, harness server-owned, VM cô lập |
| `profile` | `contribution-activity.ts`, `profile-activity.server.ts` | Tổng hợp nhật ký theo ngày Việt Nam, phân trang dữ liệu owner-private và dựng contribution calendar |
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
- Câu hỏi đã archive có lesson bị gỡ không vào manifest; câu hỏi còn hoạt động mà
  mất lesson làm loader fail closed thay vì âm thầm tạo orphan.
- Review được key theo question ID; queue/analytics tách theo deck.

Nhánh DB-native chạy `content:sync` rồi enqueue exact
`QUESTION_GENERATOR_PROMPT_VERSION`. Enqueue, claim, completion và thao tác
Admin được serialize trước khi worker gọi provider; exact lesson/source chỉ có
một lịch sử tạo nội dung được mở. Question cùng source đã materialize sẽ đóng
queue còn lại. Sibling khác version đang chờ/chạy hoặc có outcome AI chưa xác
định trả conflict, không gọi AI; Admin của bản hiện hành phải đóng row obsolete
và xác nhận riêng nếu có nguy cơ chi phí trùng. Marker exact lease được ghi
trước mỗi OpenAI/Gemini request, nên chỉ 429 xác định mới tự mở lại queue.

### Practice state

Không có Supabase: localStorage và app vẫn dùng được. Progress, study/Focus
session, mục đã lưu/đáp án AI và Hub preference đều tách theo `account UUID` hoặc
`local`; không nhận dữ liệu legacy không có chủ sở hữu. Có Supabase + đúng owner:
server phân trang đến hết review history, tải Anki projection, approvals,
overrides và usage; browser merge offline state rồi sync. RPC DB là nguồn thẩm
quyền cho cloud transition. Practice progress dùng Web Lock theo scope và chỉ
chấp nhận rating đầu tiên của exact question/ngày/content identity; RPC tiếp tục
khóa theo account/question để hai thiết bị không ghi hai transition cạnh tranh.
Review offline cũ hơn chỉ bổ sung history, không ghi lùi state; daily review của
version/hash cũ được thay khi nội dung đổi trong ngày. Batch sync loại review
archive/stale/không đủ transition trước khi gửi. Mỗi reset lịch tạo một UUID
generation bền; review và repair item giữ UUID đó cho tới lần reset tiếp theo,
nên tab cũ bị loại nhưng người học vẫn có thể reset rồi học lại trong cùng ngày.
Server đọc review trước rồi state generation sau và lọc response theo state mới
nhất. Browser giữ journal trên review `Again`/`Hard` cho tới khi repair queue đã
ghi bền; sau crash chỉ dựng lại item có đúng version/hash/generation. Bản cloud
progress/state sau mỗi sync thay ảnh chụp lúc mở trang, tránh tái nhập lịch sử đã
reset ở tab khác.

### Nhật ký trang cá nhân

Mọi `practice_reviews` + mọi `coach_attempts` đã lưu + các
`mock_interview_attempts` có `status = completed` → server đọc qua RLS của
account, phân trang toàn bộ khoảng 53 tuần → đổi timestamp sang ngày Việt Nam →
contribution calendar, streak và nhật ký gần đây. Luồng này chỉ đọc dữ liệu đã
có, không gọi AI và không tạo thêm bảng activity.

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
session. Mọi read/write kiểm tra account owner; transition dùng Web Lock + CAS
revision. Answer intent được rebase trên đúng session/status để hai lần nhập
nhanh không ghi đè nhau, còn freeze/complete/reset không chấp nhận base cũ.
Submission đầu tiên được đóng băng cùng idempotency key nên tab cũ không gửi
report trả phí, rồi server dựng lại blueprint và version trước runner/AI.
Supabase giữ một token-scoped report lease,
trả cached artifact khi response trước bị mất, release lỗi chắc chắn có thể thử
lại, terminalize provider/completion outcome mơ hồ và abort reservation khi
hidden runner bắt buộc key mới. Lease hết hạn chưa dispatch bị xóa để reserve
lại; lease đã dispatch hoặc đã nhận provider response nhưng lỗi hậu xử lý trở
thành `failed`, không được renew để gọi provider lần nữa. Targeted report
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
đã tiến ở tab khác; resume reread snapshot mới nhất trong cùng Web Lock trước
khi compare-and-set. Khi bank thiếu coverage, Hub mở guide thật hoặc báo content
gap/draft chờ owner review, không tạo queue giả.

### WorldQuant transfer loop

Manifest + approval tạo curriculum evidence; repository/owner card, pending
content, personal remediation và drill luôn là các loại bằng chứng riêng.
Scenario practice đạt rubric/follow-up đưa gap sang `transfer_ready`; checkpoint
clean không hint và đạt ngưỡng chỉ xác minh khi unseen hoặc spaced retest sau
cooldown 24 giờ. Mỗi competency có hai prompt checkpoint khác nhau; Rubric atom còn
thiếu sinh repair prompt grounded, không sao chép candidate answer. Today’s
Mission ghép due repair, exact approved Focus card, practice/checkpoint và mock
history thật trong time budget. Exact mission được snapshot theo
account/local + ngày + role + budget, cap 24 snapshot/account; reload chỉ rebuild
khi exact card competency/revision, canonical content truth hoặc capability mock
bền vững không còn hợp lệ. Hub là Guided entry: một CTA tạo exact role/budget
Mission; Mission chỉ đưa một actionable item lên làm bước kế tiếp. Focus, Drill và Mock chỉ nhận
structured return context rồi dựng lại internal Mission URL, không nhận redirect
URL tùy ý. Content gap không được coi là item có thể hoàn tất hoặc evidence hoàn
thành Mission. Primary competency nằm trong mission identity; approved card chưa
đến hạn/không vừa budget không bị gắn nhầm thành content gap. Checkpoint prompt
chỉ mở sau warm-up và
sau khi durable exposure ledger đã ghi thành công. Browser thiếu Web Locks vẫn
được luyện nhưng exposure fail closed thành non-verifying repeat. Training state
mới chỉ ở localStorage theo account/local mode. Schema/key v2 sao chép một chiều
từ khóa v1 khi khóa mới chưa tồn tại, không xóa hoặc ghi lại khóa cũ; không có
cloud sync ngầm. Mission snapshot cũng dùng key/schema v2 nhưng không di chuyển
v1: kế hoạch cũ bị bỏ qua và được dựng lại để không phục hồi drill revision đã
lỗi thời.
Danh mục bài luyện v2 chỉ tương đương v1 trên đường đọc lịch sử. Lượt hoàn tất
mới, việc chuyển hoặc xác nhận điểm cần cải thiện và thống kê chọn năng lực ít
được luyện đều dùng đúng phiên bản hiện hành; vòng phỏng vấn trộn phiên bản bị
từ chối theo hướng an toàn.

### Practice repair và scheduler shadow

Review `Again`/`Hard` vẫn ghi đúng một daily review qua scheduler chuẩn, đồng
thời enqueue exact question revision để retrieval lại sau 3/5 thẻ xen kẽ.
Repair attempt không tạo review ngày thứ hai. Study session giữ draft answer và
Rescue → Retry phase cùng các cờ hint/reveal/coach qua navigation/reload cho tới
khi exact card được rate; practice không hỏi hoặc ghi mức tự tin. Answer rỗng
được hiểu là chưa biết: AI Rescue dạy từ đầu nhưng khóa rating, sau đó người học
phải tự làm lại và nhờ AI chấm. Retry đạt tự hoàn tất bằng `Good`/`Easy`; retry
chưa đạt tự hoàn tất bằng `Again`/`Hard` qua chính review path chuẩn để vào Recall
Repair, không enqueue riêng trong AI response. Answer/code không có giới hạn ký
tự ở tầng sản phẩm.
Mutation repair queue và practice progress dùng Web Locks theo key khi browser
hỗ trợ và merge-reread làm fallback. Rating được tính từ progress vừa reread
trong lock; tab thua không sync cloud hoặc enqueue repair lần hai. Stats replay
đúng question revision bằng `ts-fsrs` ở chế độ shadow; FSRS không mutation due
date hay Preparation Index.

### Full Round và English Voice

Role weights chọn năm non-certification scenario theo C++ depth,
coding/concurrency, tick/system design, delivery/automation và English ownership;
không dùng lại checkpoint có quyền verify gap. Answer/transcript
chỉ sống trong React memory; Recall không upload/lưu audio. Web Speech là engine
của browser/OS và có privacy policy riêng. Timer tính từ deadline tuyệt đối;
WPM chỉ dùng transcript microphone và thời gian mic thật, không tính text gõ
tay. Deadline khóa answer/rubric/mic nhưng vẫn cho chuyển round với zero evidence;
voice stop có phase riêng để chờ final transcript. Khi kết thúc, app chỉ xóa
response sau durable write và lưu summary số (rubric, word/filler count) cùng
exact role/full-round/round/drill revision vào training state.

### AI coach

Request được validate + rate-limit + auth/approval check → reserve durable
evaluation/follow-up theo fingerprint và idempotency key → reserve daily OpenAI
budget bằng UUID → ghi riêng marker `dispatched` của reservation ứng dụng và
ledger hạn mức ngay trước provider → gọi model một lần (Luna cho Coach, Terra cho
report Mock) → finalize exact ledger
row → hoàn tất terminal cache. Lease ứng dụng hết hạn trước marker được thu hồi;
lease đã marker mới terminalize bảo thủ. Tab/reload gửi cùng exact request nhận
canonical cache; request khác không được tái dùng key. Daily allowance chỉ tính
interactive web requests; Costs API toàn project và background generation chỉ
tham gia monthly accounting/hard-spend backstop. Khi daily/hard quota OpenAI
hết, Gemini có thể fallback nếu config và owner toggle cho phép. Timeout, mất
mạng hoặc 5xx terminalize request và quyết toán bảo thủ, không tự gọi provider
lần hai. Múi giờ budget là `Asia/Ho_Chi_Minh`.
Candidate answer là field bắt buộc nhưng được phép rỗng; prompt đánh dấu rõ blank
là “chưa biết” để trả feedback dạy từ nền tảng.

### Mistake → flashcard

AI Coach chỉ capture sau khi attempt đã lưu và rating `again`/`hard` đã sync;
Mock v4 chỉ capture sau khi completed artifact được xác nhận bền vững. Evidence
không chứa candidate answer hay hidden runner data. Candidate được dedupe theo
concept/source, có chế độ `ask`/`auto`/`off`; AI chỉ sinh draft có lesson section
được xác minh, rồi owner phải duyệt exact revision trước khi học. Remediation card
được ưu tiên trong quota New, có thể đóng góp learning evidence nhưng không làm
tăng WorldQuant content coverage. Completion RPC có thể thử lại cùng draft một
lần sau response mơ hồ; nếu vẫn không xác nhận, hoặc provider outcome không xác
định, đúng lease chuyển `dead_letter`. Retry protocol v3 reclaim lease hết hạn
chưa có marker provider; lease đã marker mới bị dead-letter và trigger DB chặn
materialize draft chưa dispatch. Candidate kết thúc không được claim lại để gọi
AI lần nữa. Với Coach mistake, browser giữ attempt marker trên exact review cho
tới khi sync route xác nhận đã capture hoặc chủ động loại; response cũ không thể
xóa marker của request mới.

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
- `ts-fsrs` cho scheduler FSRS-6 shadow, không làm scheduler thẩm quyền
