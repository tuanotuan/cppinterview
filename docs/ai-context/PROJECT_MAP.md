# Project map

Tài liệu ổn định để tìm đúng vùng code. Xác minh lại nếu source mới hơn.

## Cấu trúc repo

| Path | Vai trò |
|---|---|
| `cpp98_foundation/`, `cpp11/`, `cpp14/`, `cpp17/`, `cpp20/`, `cpp23/` | Lesson C++; mỗi thư mục bài có canonical `knowledge.md` hoặc `vi.md`, có thể thêm `en.md` song ngữ và thường có `main.cpp` |
| `python/` | Ghi chú cá nhân giữ nguyên trong repo; web không quét, đồng bộ hoặc hiển thị |
| `web/` | App cppinterview: Next.js App Router, React, TypeScript |
| `web/src/proxy.ts`, `web/src/i18n/` | Entry point kết hợp refresh cookie/session Supabase với định tuyến locale `vi`/`en`; API, Admin và WorldQuant được bỏ qua khỏi locale middleware |
| `web/src/app/[locale]/layout.tsx`, `web/src/app/site-footer.tsx`, `web/src/app/site-footer-session-grid.tsx`, `web/src/app/site-footer-links.ts` | Shell learner theo locale, `html lang`, message provider, footer và mobile navigation/tracker dùng chung; footer dùng trạng thái boolean từ `/api/auth/status` để chỉ render cột CTA/tài khoản cho khách mà không làm root layout mất static rendering; link ngoài được khai báo tập trung cho GitHub và cộng đồng Vibe Coding; Admin/WorldQuant có document layout riêng không prefix locale |
| `web/src/messages/`, `web/src/content-translations/`, `web/src/lib/content/question-translations.server.ts` | Chuỗi UI theo namespace, overlay bản dịch bind exact revision và publication đã duyệt từ Supabase; ID/version/hash/taxonomy/code/source không bị dịch |
| `web/src/app/recall-mobile-nav.tsx` | Điều hướng mobile dùng chung: Học hôm nay, Nhiệm vụ, Trung tâm chuẩn bị, Thư viện, Hồ sơ; tự ẩn ở mock/full-round để giữ không gian phỏng vấn |
| `web/content/` | Registry lesson, question và roadmap YAML do Git quản lý; roadmap chỉ tổ chức đường học, không tạo lesson giả |
| `web/src/generated/content-manifest.json`, `web/src/generated/lesson-translations-en.json` | Manifest và overlay lesson tiếng Anh deterministic, không sửa tay |
| `web/supabase/migrations/` | Schema/RPC/RLS theo thứ tự timestamp |
| `.github/workflows/web-validate.yml` | CI validate, refresh/sync/generate content |
| `.agents/skills/`, `update-skills.ps1` | Project-local skills for coding agents; script refreshes the bundled skills from their upstream sources |
| `note.txt` | Prompt/reference checklist for coding agents |
| `AGENTS.md`, `AI_START_HERE.md` | Rule duy trì handoff và file định tuyến cho session mới |
| `docs/ai-context/GENERATED_SNAPSHOT.md` | Inventory/fingerprint deterministic do script sinh |

App phải ở `web/`; content tooling dựa vào vị trí này để tìm repo root.

## Visual foundation

Root layout cung cấp skip link, footer và mobile navigation dùng chung;
`app/brand-mark.tsx` cung cấp logo C++ thống nhất cho header, trạng thái truy cập và
footer. `globals.css`
chứa token semantic cho light theme navy + turquoise, bề mặt workspace phẳng,
action, app-header trắng và thang bo góc 12/16/20 px dùng chung. Footer learner
dùng surface midnight full-bleed với token text/link/border riêng, còn nội dung
giữ cùng `ui-page-width`; khoảng reserve dưới mobile navigation cũng dùng nền
footer để không tạo dải sáng. Cột “Bắt đầu” chỉ xuất hiện sau khi endpoint auth
xác nhận người xem là khách; trạng thái đang kiểm tra và account đã đăng nhập dùng
lưới hai cột để không giữ khoảng trống. Gradient chỉ nằm ở landing; navigation active dùng
nền turquoise nhạt, chữ navy và indicator thay vì pill tối. Landing, Practice,
thư viện, Mock, Stats và Profile dùng cùng
header/card/CTA và `ui-page-width` trên desktop lẫn mobile. Practice chỉ có một bộ
câu C++ nên header hiển thị số câu đã duyệt như metadata, không dựng control đổi
bộ câu không có lựa chọn thực.
Practice có Chế độ tập trung tạm thời (thoát `Esc`, mở đáp án `Alt + A`) để ẩn
shell/sidebar; feedback AI ưu tiên đúng/sửa/làm tiếp, còn rubric đầy đủ nằm trong
`details`. Khung trả lời thường chỉ giữ label và placeholder; hai dòng autosave/
blank-helper dư thừa không được render nhưng hành vi lưu answer và gửi blank cho AI
không đổi. Focus-visible và responsive inset vẫn áp dụng cho control sticky. Modal do app tự tạo dùng
`web/src/app/accessible-dialog.ts` để khóa scroll, trả focus, đóng bằng Escape
và giữ focus trong dialog; không dùng browser dialog cho luồng xác nhận.

## AI context maintenance

`web/scripts/generate-ai-context.ts` tính inventory và fingerprint từ lesson,
content, app source/test, scripts, package/env, workflow và Supabase. Chạy
`npm run context:refresh` sau mọi project change; `context:check` nằm trong
`validate`. Snapshot chỉ giữ facts máy tính được. Thay đổi semantic phải cập
nhật file context tương ứng theo root `AGENTS.md`.

## C++-only product boundary

cppinterview only serves C++ lessons, questions, code exercises, and mock
interviews. Discovery is limited to `cpp98_foundation/`, `cpp11/`, `cpp14/`,
`cpp17/`, `cpp20/`, and `cpp23/`. Migration `20260818110000_archive_non_cpp_content.sql` archives
retired Python/CMake database content while preserving revision history.

## Runtime và entry points

Mọi route learner trong bảng được phục vụ dưới prefix bắt buộc `/vi` hoặc `/en`;
URL không prefix được middleware chuyển sang locale cookie/browser, mặc định là
`vi`. Language switcher dùng menu cờ SVG Việt Nam/Vương quốc Anh, tên đầy đủ trên
desktop/footer và mã `VI`/`EN` ở header mobile; menu hỗ trợ bàn phím, trả focus,
giữ nguyên pathname, query, hash và vị trí cuộn khi đổi locale. `/admin`,
`/worldquant`, API và callback kỹ thuật của Auth vẫn không prefix. Link từ bề
mặt learner đã locale hóa tới `/admin` phải dùng `next/link` trực tiếp, không
dùng navigation wrapper của `next-intl`, để không sinh nhầm `/vi/admin` hoặc
`/en/admin`.

| URL/vùng | Entry point | Chức năng |
|---|---|---|
| `/` | `[locale]/page.tsx`, `recall-landing-page.tsx` | Landing public của cppinterview: giới thiệu luồng học, thư viện, AI coach, mock interview và đăng nhập/đăng ký; account đã đăng nhập được chuyển sang Practice cùng locale (trừ khi route mang thông báo auth); CTA thử luyện mở guest mode |
| `/practice` | `[locale]/practice/page.tsx`, `practice-app.tsx`, `code-review-workspace.tsx`, `question-editor-dialog.tsx`, `confirmation-dialog.tsx` | Today workspace: CTA tiếp tục/luyện thêm, tiến độ và chỉ số ngày trước card; guest mode `?guest=1` giữ tiến độ local và mở Luna với giới hạn public 3 lượt/24 giờ, còn vùng trả lời không lặp cảnh báo trial cho tài khoản đã đăng nhập; Daily/custom study và Focus Sprint exact queue; `study=lesson-check` là kiểm tra một lần cho exact lesson, chỉ nhận ID question đã qua publication/approval filter và không rating, ghi review hay cập nhật scheduler; `/en/practice` chỉ nhận question có overlay đúng revision, đồng thời ẩn source excerpt/title lesson chưa có overlay để không fallback sang tiếng Việt; mỗi thẻ chỉ hiện hai nhãn phân loại độ khó và Text/Code theo locale, còn taxonomy nội bộ không lộ ra hoặc lọc ở UI; question overlay, toàn bộ control/modal và AI Coach dùng locale phiên hiện tại; `code_review` thay textarea bằng workspace chọn dòng, lưu annotation vào candidate answer để tồn tại qua F5 và gửi nguyên vẹn cho Coach, không lộ rubric/comment mẫu; answer không giới hạn sản phẩm, blank = chưa biết và vẫn gọi được AI, rating, scheduler, cloud sync, saved state, owner-only edit/archive thẻ và return về Guided Mission; thao tác phá hủy dùng confirmation sheet của cppinterview thay vì hộp thoại trình duyệt |
| `/worldquant/*` | `worldquant/layout.tsx` và các module lịch sử | Workspace chuẩn bị theo một công ty cũ chỉ còn truy cập được bởi admin GitHub `tuanotuan`; người học thường bị chuyển về `/practice`. Không có entry point công khai tới vùng này. |
| `/learn` | `[locale]/learn/page.tsx`, `[locale]/learn/[lessonId]/page.tsx`, `app/learn/lesson-ai-assistant.tsx` | Thư viện lesson từ manifest với UI theo locale, tìm kiếm và chip riêng cho từng chuẩn C++98/11/14/17/20/23; chuẩn chưa có lesson bị khóa; card chỉ giữ chuẩn C++, số bài và tiêu đề. Reader render Markdown/code mẫu, đổi VI/EN tại header, đặt CTA kiểm tra ở đầu/cuối bài và có đúng một panel “Học với AI”: mobile nằm trước mục lục/nội dung, desktop sticky bên phải, transcript chỉ ở React memory |
| `/learn/roadmap/cpp11`, `/learn/roadmap/cpp14`, `/learn/roadmap/cpp17`, `/learn/roadmap/cpp20`, `/learn/roadmap/cpp23` | Route locale theo chuẩn, `app/learn/{cpp11,cpp14,cpp17,cpp20,cpp23}-roadmap-app.tsx`, `app/learn/cpp-roadmap-map.tsx`, `lib/learn/{cpp11,cpp14,cpp17,cpp20,cpp23}-roadmap.ts` | Roadmap song ngữ: C++11 có 53 ngày/8 chặng; C++14 và C++17 đều có 50 ngày/7 chặng; C++20 có 52 ngày/8 chặng; C++23 có 54 ngày/8 chặng. Cả năm chỉ link lesson `ready` đúng track và dùng chung sơ đồ node/connector ba cột ziczac trên desktop, một trục dọc trên tablet/mobile. Node mở lesson chính trong tab mới; coverage không phải tiến độ người học |
| `/mock-interview` | `[locale]/mock-interview/page.tsx`, `app/mock-interview/general-cpp-mock-app.tsx` | Phỏng vấn thử công khai v5 cho một vị trí C++ Engineer, 30/45/60 phút tương ứng 5/8/10 câu. Plan deterministic bắt buộc phủ C++11/14/17/20/23, ưu tiên đa dạng lesson/chủ đề/năng lực và chỉ hiện thứ tự/trạng thái trả lời trong lúc làm. Logo header là link có nhãn trợ năng về trang chủ đúng locale ở màn hình bắt đầu, đang làm và báo cáo. Khách lưu tối đa năm báo cáo trong browser; tài khoản có thêm history cloud theo account. Mỗi card lịch sử mở lại report từng câu; phiên mới kèm snapshot đề/code/câu trả lời đã nộp, còn artifact cũ thiếu snapshot vẫn đọc nguyên feedback AI. Report trung lập theo công ty, tính lại điểm từ từng câu rồi trình bày theo chuẩn C++, bảy năng lực, tám tiêu chí và đúng ba hành động tiếp theo. Mock v4/Targeted Mock cũ chỉ còn phục vụ workspace lịch sử `/worldquant` và không được import vào entry point công khai. |
| `/learn/tick-data-order-book` | `learn/tick-data-order-book/page.tsx`, `lib/learn/tick-data-guide.ts` | Guide tick data/order book |
| `/stats` | `[locale]/stats/page.tsx`, `[locale]/stats/_components/coverage-dashboard.tsx`, `lib/practice/coverage-analytics.ts` | Dashboard tiến độ theo độ phủ của 777 câu canonical trong repo: tổng quan, C++11/14/17/20/23, độ khó, ma trận chuẩn × độ khó và khoảng trống chủ đề; CTA mở đúng custom-study queue tương ứng |
| `/profile` | `profile/page.tsx`, `lib/profile/{contribution-activity,mobile-usage,profile-activity.server}.ts` | Trang cá nhân và contribution graph 53 tuần từ lượt ôn, AI coach và phỏng vấn thử đã hoàn tất; riêng admin `tuanotuan` còn có tổng thời gian cppinterview hoạt động trên điện thoại hôm nay/7/30 ngày |
| `/admin` | `admin/page.tsx`, `admin-dashboard.tsx`, `manual-question-dialog.tsx`, `input-dialog.tsx` | Review/edit/archive question, duyệt riêng bản dịch English cùng canonical ID/taxonomy, schedule, AI/job settings và thêm câu hỏi thủ công. Ngân hàng câu hỏi chỉ tìm kiếm và lọc theo trạng thái vận hành/học; mỗi card chỉ hiện Dễ/Trung bình/Khó và Text/Code, còn taxonomy/loại câu vẫn là metadata nội bộ. Editor Admin quản lý thêm dạng đánh giá; chi tiết chỉ ở Admin mới nêu kỹ năng đo, standard, thời lượng và điều kiện test. Câu thủ công là DB-native draft có revision/audit, chỉ cần đề bài và đáp án tham khảo, không gắn lesson hay file `.md`, rồi chờ duyệt; header ưu tiên Luyện hôm nay, Thư viện, Mức bao phủ và chuẩn bị phỏng vấn; xác nhận/ràng buộc nguồn của mistake card dùng sheet/form trong UI thay vì API dialog của trình duyệt |
| `/admin/coverage` | `admin/coverage/page.tsx`, `lib/content/interview-bank.ts` | Mức bao phủ ngân hàng câu hỏi và bảng mục tiêu 300 câu C++ đã xác minh theo sáu dạng đánh giá; draft hay owner approval không được tính là verified |
| `/auth` và `/auth/*` | `auth/page.tsx`, `auth-form.tsx`, `auth-actions.ts`, `auth/{login,callback,confirm,logout,reset-password,set-password}` | Đăng ký/đăng nhập email-mật khẩu với xác nhận email, khôi phục OTP cho email identity, cùng Google và GitHub OAuth; OAuth-only account đặt thêm mật khẩu sau khi đăng nhập tại `/auth/set-password`; mọi Supabase account đã xác thực dùng cppinterview, chỉ admin giữ GitHub identity `tuanotuan` |

API quan trọng:

- `api/auth/status`: xác minh JWT Supabase ở server rồi chỉ trả boolean account đã
  đăng nhập; response private/no-store, không trả identity và giúp footer tĩnh ẩn
  toàn bộ CTA/tài khoản dành cho khách mà không đọc cookie trong root layout.
- `api/coach/{evaluate,follow-up,clarify}`: chấm, giải thích và diễn giải đề. `clarify` owner-only, dùng Luna, diễn đạt bình dân theo tình huống thay vì từ điển thuật ngữ và không gửi đáp án/rubric; evaluate/follow-up dùng OpenAI trước, Gemini fallback theo quota.
- `api/coach/lesson`: server dựng lại toàn bộ lesson đúng locale từ manifest, gọi Luna với structured answer/citation và không nhận context lesson từ client; public/non-admin dùng chung quota AI 3 lượt/24 giờ, owner dùng durable reservation + budget hiện hữu, không fallback Gemini.
- `api/mock-interview/general-report`: dựng lại exact plan v5 từ câu verified hoặc revision được content admin duyệt, giữ đáp án mẫu/hint/rubric ở server, gọi Luna qua quota/budget public rồi trả/lưu snapshot chỉ gồm đề/code và câu trả lời người dùng cùng normalized artifact; cloud chỉ ghi khi có account.
- `api/mock-interview/{run,report,history}`: API v4 lịch sử cho workspace admin; chạy sample code, xác minh exact blueprint, tạo report có hidden evaluation và đọc/xóa history theo account.
- `api/progress/sync`: đồng bộ review/Anki state.
- `api/worldquant/{training-state,mission-snapshot}`: state của workspace lịch sử,
  chỉ còn reachable qua khu vực admin; browser fallback về local khi API/database chưa sẵn sàng.
- `api/profile/mobile-usage`: heartbeat riêng cho admin `tuanotuan`, chỉ nhận tab UUID ngắn hạn từ trình duyệt điện thoại đang hiển thị và ghi aggregate thời gian hoạt động.
- `api/mistakes/{generate,preferences,resolve,ground,backfill}`: Mistake Inbox
  owner-private, grounded card generation và recovery từ Mock v4.
- `api/questions/approve`: duyệt đúng question version + source hash.
- `api/admin/questions/approve-translation`: admin xuất bản đúng English copy ở
  catalog server cho exact question version/hash; không tạo question ID mới.
- `api/admin/{questions,question-state,ai-settings,generation-jobs}`: mutation
  owner-only; `api/admin/questions/manual` tạo DB-native draft thủ công từ đề bài và đáp án tham khảo, có audit revision nhưng không cần nguồn lesson.
- `api/admin/content-parity`: so Git manifest với DB trước cutover.

## Các domain trong `web/src/lib`

| Domain | File đầu mối | Trách nhiệm |
|---|---|---|
| `content` | `loader.ts`, `schema.ts`, `automation.ts`, `translations.ts` | Parse canonical `vi.md` của lesson song ngữ hoặc legacy `knowledge.md`, kiểm tra companion `en.md` cùng topology, sinh manifest/overlay và chỉ áp question translation đã publication exact copy mà không đổi identity/source/code |
| `content` | `question-store-server.ts` | Chọn `repo`/`shadow`/`db`, parity, apply override |
| `learn` | `lesson-library.ts`, `{cpp11,cpp14,cpp17,cpp20,cpp23}-roadmap.ts` | Dựng catalog lesson và validate/localize registry roadmap riêng; node roadmap chỉ link lesson đúng track đã xuất bản, không tham gia discovery hay question sync |
| `practice` | `learning-state.ts`, `scheduler.ts`, `storage.ts`, `progress-sync.ts`, `study-session.ts` | Queue Anki, rating nguyên tử, due date, streak, browser/cloud progress và draft/phase Trợ giúp → Làm lại |
| `practice` | `coverage-analytics.ts`, `custom-study.ts` | Tính độ phủ từ canonical repo question + exact current identity, phân loại chưa phủ/đang học/đã nhớ/đến hạn và dựng deep-link luyện theo chuẩn, độ khó hoặc chủ đề mà không nhận DB-native extra |
| `practice` | `lesson-check.ts` | Validate/build link kiểm tra theo lesson, giữ đúng tập question ID đã được server publication/approval filter và completion cục bộ không tham gia lịch ôn |
| `practice` | `repair-queue.ts`, `rescue-retry.ts`, `fsrs-shadow.ts`, `browser-storage-lock.ts` | Blank-answer Rescue → Retry, same-session repair exact identity, cross-tab mutation lock và FSRS-6 chỉ quan sát |
| `practice` | `focus-session.ts`, `focus-eligibility.ts` | Session Focus Sprint identity-only, resume/reconcile/completion và lọc exact approved refs |
| `practice` | `cloud-server.ts`, `cloud.ts`, `practice-review-reader.server.ts`, `question-learning-state-reader.server.ts` | `loadCloudAccount` chỉ xác minh account/owner cho guard; `loadCloudContext` dùng lại identity đã xác minh trong request rồi đọc review trước/state generation sau với fallback migration hẹp, approval, overrides, usage và manifest; loader evidence Coach dùng cùng identity đã cache |
| `practice` | `mistake-cards.ts`, `mistake-cards.server.ts` | Capture lỗi durable, dedupe, grounded generation và materialize draft |
| `evidence` | `contracts.ts`, `adapters.ts`, `account-evidence.server.ts`, `engine.ts`, `golden-*` | `AttemptArtifact` v1 chuẩn hóa attempt Practice/Coach/Mock; account reader dựng `EvidenceProjection` v2 an toàn từ durable Coach history; engine tách evidence kết luận khỏi lỗi hạ tầng/revision mất hiệu lực, tổng hợp `unassessed`/`learning`/`verified`/`stale` và corpus golden khóa grading contract |
| `worldquant` | `evidence.ts`, `readiness.ts`, `focus-plan.ts`, `mission.ts` | Composer Coach/Mock dùng chung cho Hub và Mission; role/competency model cùng planner deterministic theo gap/time budget, có thể ưu tiên đúng câu cần repair/refresh |
| `worldquant` | `curriculum.ts`, `curriculum-evidence.ts`, `drills.ts` | Concept graph, content/transfer coverage và catalog 30 scenario: một practice + hai checkpoint mỗi competency |
| `worldquant` | `training-state.ts`, `mission-snapshot.ts`, `tick-replay.ts`, `legacy-modern-capstone.ts` | Evidence account-scoped, cloud CAS/local fallback, Mission frozen, mô phỏng tick và capstone chuyển đổi legacy |
| `ai` | `openai.ts`, `gemini.ts`, `fallback.ts`, `access.ts` | Provider call không transport retry, fallback và chặn AI không quota ngoài local development; Luna cho học tập/Coach và report Mock v5 công khai, Terra chỉ còn cho report Mock v4 lịch sử |
| `ai` | `budget.ts`, `usage.ts`, `billing.ts`, `coach-idempotency-client.ts`, `coach-reservation.server.ts`, `coach-follow-up-reservation.server.ts`, `lesson-assistant-{context,reservation}.server.ts` | Sổ hạn mức UUID, context lesson server-canonical, phân loại kết quả provider và terminal cache theo exact request |
| `ai` | `public-ai-quota.server.ts`, `public-ai-admission.server.ts`, `public-ai-quota-display.ts`, `public-ai-budget.server.ts` | AI Coach, lesson tutor và Mock v5 public/non-admin: HMAC IP/device/account, rolling 24 giờ dùng chung, lease chống gọi trùng và ledger Luna site-wide riêng; không dùng identity thô hay Gemini fallback |
| `mock-interview` | `general-catalog.ts`, `published-bank.server.ts`, `contracts-v5.ts`, `session-v5.ts`, `general-report-prompt.ts` | Catalog browser-safe từ câu verified hoặc exact admin approval, plan C++11–23 deterministic, session guest/account local, contract/report trung lập, snapshot history có version/hash và parser tương thích artifact cũ; prompt chấm chỉ dựng ở server |
| `mock-interview` | `profile.ts`, `profile-server.ts`, `catalog.ts`, `target-plan.ts`, `session-v4.ts`, `contracts-v4.ts` | Luồng v4 theo JD/scenario của workspace WorldQuant lịch sử; không còn sở hữu route Mock công khai |
| `mock-interview` | `contracts.ts`, `report-prompt.ts`, `history.server.ts`, `report-submission-client.ts`, `trends.ts` | Report raw/normalized, danh mục evidence server-owned cho tám tiêu chí và đúng ba next-practice actions; lease/cache/idempotency chống stale cross-tab submission và trend chỉ trên attempt comparable |
| `worldquant` | `mock-debrief.ts`, `mock-gates.ts`, `mock-remediation.ts` | Role-scoped evidence, assessed/not-assessed matrix, deterministic ranked gaps, non-AI competency gate và Focus remediation |
| `worldquant` | `hub-preferences.ts` | Preference của Readiness Hub tách theo account/local và đồng bộ giữa tab cùng scope |
| `code-runner` | `admission.server.ts`, `execution-specs.server.ts`, `vercel-sandbox.server.ts` | Quota/idempotency, harness server-owned, VM cô lập |
| `profile` | `contribution-activity.ts`, `profile-activity.server.ts` | Tổng hợp nhật ký theo ngày Việt Nam, phân trang dữ liệu owner-private và dựng contribution calendar |
| `supabase` | `server.ts`, `config.ts`, `authorization.ts` | SSR client và owner allowlist |
| `admin` | `dashboard.ts` | Tổng hợp dữ liệu admin |

Test nằm cạnh source dưới dạng `*.test.ts`. Khi sửa một domain, tìm test cùng
tên trước khi thêm test mới.

## Luồng dữ liệu chính

### Lesson đến practice

`knowledge.md` hoặc `vi.md` + optional `en.md`/code mẫu → `content/lesson-registry.yaml` →
`content:refresh`/loader → generated manifest + lesson translation overlay → question store
(`repo`, `shadow`, hoặc `db`) → private overrides + question/translation
approvals → practice deck.

Quy tắc:

- ID lesson ổn định; rename folder chỉ đổi `sourcePath`.
- Source hash đổi thì approval cũ mất hiệu lực và question thành
  `needs_review`.
- AI chỉ tạo `draft`; con người mới duyệt.
- English question draft là một mục review riêng nhưng giữ canonical question
  ID/version/hash/taxonomy. Chỉ DB publication khớp nguyên văn catalog hiện tại
  mới mở bản dịch trong Practice, Coach và Mock; sửa copy đưa nó về chờ duyệt.
- CTA luyện ở lesson dùng `study=lesson-check`: server lọc publication/approval
  trước khi truyền exact question ID; marker restart một lần xóa snapshot client
  đúng account/lesson khi mở lượt mới nhưng được bỏ khỏi URL để F5 có thể resume.
  Client không gọi rating, ghi review hay scheduler.
- Archive vẫn giữ question và history để có thể khôi phục. “Từ chối” trong hàng
  đợi là quyết định vĩnh viễn theo question ID: RPC admin ghi tombstone toàn cục,
  question store loại ID đó khỏi ngân hàng sau mọi lần sync, còn source/revision
  append-only chỉ được giữ làm audit và không có luồng khôi phục trên web.
- Câu hỏi đã archive có lesson bị gỡ không vào manifest; câu hỏi còn hoạt động mà
  mất lesson làm loader fail closed thay vì âm thầm tạo orphan.

### Roadmap đến lesson

`content/roadmaps/{cpp11,cpp14,cpp17,cpp20,cpp23}.yaml` → validator tương ứng trong `lib/learn/`
khóa số ngày, phase, dependency và lesson ID đúng track → route locale
`/learn/roadmap/{cpp11,cpp14,cpp17,cpp20,cpp23}` → link tới lesson reader hiện có. Thứ tự roadmap
độc lập với `lesson.order`; node planned không được tạo placeholder trong lesson
registry. Coverage roadmap là trạng thái học liệu, không đọc localStorage,
Supabase hay scheduler.
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
competency → browser merge local/cloud progress → learning evidence theo Anki state;
song song, server đọc bounded Coach history theo account và Mock v4 history, validate
exact identity rồi composer dùng chung dựng `EvidenceProjection` không có câu trả lời thô
cho cả Hub và Today’s Mission → giới hạn hai
card mỗi lesson + tối đa một đơn vị Coach/Mock mỗi competency → áp target và role weight.
Projection v2 chỉ dùng artifact hiện hành và có kết quả hạ tầng kết luận được để
tính điểm; lỗi runner đi vào `inconclusiveArtifactIds`, revision cũ đi vào
`invalidatedArtifactIds`, không hạ readiness hay tạo nhiệm vụ sửa lỗi cho người học.
Hub tách `coverage`
(content bank đã kiểm chứng) khỏi `Preparation Index` (bằng chứng người học đã tích
lũy), nên thiếu content không bị diễn giải thành điểm yếu cá nhân. Anki vẫn là nguồn
lịch ôn trực tiếp để Practice review không bị đếm đôi; Coach/Mock projection chỉ bổ
sung readiness và ưu tiên exact câu `repair`/`refresh`. Hub đọc history v4 theo account,
chỉ so trend cùng role/profile version, duration và evidence scope; report có
exact question identity được chuyển thành `AttemptArtifact` rồi qua Evidence
Engine, còn lịch sử cũ dùng debrief fallback. Mục `not_assessed` không bị đổi
thành điểm 0.

### WorldQuant Interview Loop v4 / Targeted Mock v2

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

Targeted Mock v2 đóng băng profile v2 và scenario family (`new-feed` hoặc
`migration-incident`) vào plan. Đề v1 cũ vẫn parse/read để lịch sử còn xem được,
nhưng không bị so trend trực tiếp với v2. Server dựng lại exact plan từ catalog
trước khi chạy hidden test/AI; gate C++ correctness, market-data correctness và
migration evidence được tính từ mapping và hidden execution, không từ nhận xét
của AI. Mỗi gate ngưỡng 65, có trạng thái `not_assessed` khi scenario không đo
được; artifact luôn tuyên bố rõ đây không phải kết luận sẵn sàng cho vị trí.

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
history thật trong time budget; evidence `repair` rồi `refresh` được ưu tiên trước
gap cũ khi projection đề xuất một exact question còn hiện hành. Exact mission được snapshot theo
account/local + ngày + role + budget, cap 24 snapshot/account; reload chỉ rebuild
khi exact card competency/revision, canonical content truth hoặc capability mock
bền vững không còn hợp lệ, hoặc fingerprint an toàn của evidence đã đổi. Hub là Guided entry: một CTA tạo exact role/budget
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
chưa đạt tự hoàn tất bằng `Again`/`Hard` qua chính review path chuẩn để vào cppinterview
Repair, không enqueue riêng trong AI response. Answer/code không có giới hạn ký
tự ở tầng sản phẩm.
Mutation repair queue và practice progress dùng Web Locks theo key khi browser
hỗ trợ và merge-reread làm fallback. Rating được tính từ progress vừa reread
trong lock; tab thua không sync cloud hoặc enqueue repair lần hai. Module
`fsrs-shadow.ts` vẫn là thử nghiệm chỉ quan sát và không mutation due date; route
Stats không còn render phép so sánh này.

### Full Round và English Voice

Role weights chọn năm non-certification scenario theo C++ depth,
coding/concurrency, tick/system design, delivery/automation và English ownership;
không dùng lại checkpoint có quyền verify gap. Answer/transcript
chỉ sống trong React memory; cppinterview không upload/lưu audio. Web Speech là engine
của browser/OS và có privacy policy riêng. Timer tính từ deadline tuyệt đối;
WPM chỉ dùng transcript microphone và thời gian mic thật, không tính text gõ
tay. Deadline khóa answer/rubric/mic nhưng vẫn cho chuyển round với zero evidence;
voice stop có phase riêng để chờ final transcript. Khi kết thúc, app chỉ xóa
response sau durable write và lưu summary số (rubric, word/filler count) cùng
exact role/full-round/round/drill revision vào training state.

### AI coach và lesson tutor

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
Coach evaluate/follow-up/clarify và Mock report localize exact manifest theo
`responseLocale` trước khi dựng prompt. English chỉ dùng question overlay đúng
revision và prompt buộc mọi field người học nhìn thấy trả về bằng tiếng Anh;
OpenAI và Gemini nhận cùng contract locale.
Candidate answer là field bắt buộc nhưng được phép rỗng; prompt đánh dấu rõ blank
là “chưa biết” để trả feedback dạy từ nền tảng.

Lesson reader chỉ gửi `lessonId`, locale, transcript giới hạn và UUIDv8
idempotency. Route `/api/coach/lesson` localize manifest rồi serialize đủ mọi
section và code mẫu, khóa context ở 20.000 ký tự và không đưa question/rubric/
answer bank vào prompt. Luna trả structured answer cùng tối đa bốn section ID;
server lẫn client đều từ chối citation không thuộc exact lesson. Tối đa bốn lượt
hỏi trong một transcript memory-only; đổi lesson/locale/content hash tạo panel
mới. Prompt buộc đúng ngôn ngữ UI, coi lesson/conversation là dữ liệu không tin
cậy và phân biệt kiến thức trong bài, kiến thức C++ bổ sung, ngoài phạm vi.

Guest và tài khoản không phải owner đi qua public admission riêng. `/practice`
đọc trước số lượt hiệu dụng bằng IP HMAC cùng device/account hiện có; một profile
ẩn danh mới chưa có cookie vẫn kế thừa giới hạn mạng. Admission v2 giữ khóa của
RPC v1 rồi trả mức còn lại nhỏ nhất giữa IP, device và account. Trạng thái chưa
đọc được được hiển thị là chưa xác định, không mặc định thành `3/3`; không dùng
fingerprint để nhận diện thiết bị sau khi dữ liệu ẩn danh bị xóa.

### Mistake → flashcard

AI Coach chỉ capture sau khi attempt đã lưu và rating `again`/`hard` đã sync;
Mock v4 chỉ capture sau khi completed artifact được xác nhận bền vững. Báo cáo
mới phải cite evidence server-canonical, nhưng Mistake Inbox chỉ giữ metadata
an toàn của evidence, không chứa candidate answer hay hidden runner data. Ba
next-practice actions được ưu tiên capture đúng thứ tự 1–3; artifact lịch sử
không có contract mới mới dùng fallback missed criteria. Candidate được dedupe
theo concept/source, có chế độ `ask`/`auto`/`off`; AI chỉ sinh draft có lesson
section được xác minh, rồi owner phải duyệt exact revision trước khi học. Remediation card
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
