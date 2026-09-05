# Đóng góp cho cppinterview

Cảm ơn bạn đã muốn cải thiện cppinterview. Dự án hoan nghênh sửa lỗi, kiểm thử,
tài liệu, khả năng truy cập, hiệu năng và học liệu C++ chất lượng cao.

Hướng dẫn này dành cho người đóng góp. Quy tắc dành riêng cho coding agent nằm
trong [`AGENTS.md`](AGENTS.md) và [`AI_START_HERE.md`](AI_START_HERE.md).

## Trước khi bắt đầu

- Tìm trong issue và pull request, kể cả mục đã đóng, để tránh làm trùng.
- Với sửa lỗi nhỏ hoặc tài liệu rõ phạm vi, bạn có thể mở pull request trực tiếp.
- Với tính năng mới, thay đổi kiến trúc, schema, contract API/AI hoặc refactor lớn,
  hãy mở issue trước để thống nhất vấn đề, phạm vi và tiêu chí hoàn thành.
- Giữ mỗi pull request tập trung vào một mục tiêu có thể review độc lập. Tách sửa
  lỗi hoặc dọn dẹp không liên quan sang pull request khác.
- Không đăng secret, dữ liệu cá nhân, exploit chưa công bố hoặc thông tin tài
  khoản thật trong issue, log, ảnh chụp hay pull request. Với lỗ hổng bảo mật,
  ưu tiên GitHub private vulnerability reporting nếu repository đang bật tính
  năng đó; nếu không, liên hệ riêng chủ repository qua hồ sơ GitHub trước khi
  công khai chi tiết.

Bug report nên có hành vi mong đợi, hành vi thực tế, bước tái hiện tối thiểu,
môi trường chạy và log đã loại bỏ dữ liệu nhạy cảm.

## Phạm vi repository

| Khu vực | Vai trò |
|---|---|
| `cpp98_foundation/`, `cpp11/`, `cpp14/`, `cpp17/`, `cpp20/`, `cpp23/` | Nguồn bài học theo từng phiên bản C++ |
| `dailycppinterview/` | Output sinh từ catalog của collection Real-World C++ Interviews; không sửa tay thay cho nguồn |
| `web/` | Ứng dụng Next.js, test, content registry và Supabase migrations |
| `web/content/questions/` | Câu hỏi Git-owned có version và trạng thái duyệt |
| `web/src/messages/` | Chuỗi giao diện `vi`/`en` |
| `docs/ai-context/` | Bàn giao kiến trúc, phát triển và trạng thái hiện hành |
| `python/` | Ghi chú cá nhân, không thuộc content pipeline của web |

Sản phẩm chỉ phục vụ học và luyện phỏng vấn C++. Không thêm Python hoặc CMake
vào content discovery của web. Không sửa trực tiếp file sinh tự động để thay
cho nguồn của nó, đặc biệt là
`web/src/generated/content-manifest.json` và
`docs/ai-context/GENERATED_SNAPSHOT.md`.

## Thiết lập môi trường

Yêu cầu chính:

- Git;
- Node.js 22;
- npm đi kèm Node.js;
- PowerShell hoặc shell tương đương.

Từ thư mục repository:

```powershell
cd web
npm ci
Copy-Item .env.example .env.local
npm run content:refresh
npm run dev
```

Trên PowerShell, dùng `npm.cmd` nếu execution policy chặn `npm.ps1`.

Ứng dụng vẫn chạy local-only khi không cấu hình Supabase. Không dùng credential
production để phát triển thông thường và không commit `.env.local`. Danh sách
biến môi trường chuẩn nằm trong [`web/.env.example`](web/.env.example).

## Quy trình làm thay đổi

1. Fork repository nếu cần và tạo nhánh từ `main` mới nhất.
2. Đặt tên nhánh theo phạm vi, ví dụ `feat/...`, `fix/...`, `docs/...`,
   `perf/...` hoặc `content/...`.
3. Đọc tài liệu gần phần sẽ sửa:
   - [`docs/ai-context/PROJECT_MAP.md`](docs/ai-context/PROJECT_MAP.md) để tìm
     module và entry point;
   - [`docs/ai-context/DEVELOPMENT.md`](docs/ai-context/DEVELOPMENT.md) cho
     command, content, database, security và invariant;
   - [`web/content/README.md`](web/content/README.md) khi sửa lesson/question;
   - [`web/supabase/README.md`](web/supabase/README.md) khi sửa database.
4. Viết thay đổi nhỏ nhất giải quyết đúng vấn đề; tránh format hoặc rename hàng
   loạt không liên quan.
5. Thêm hoặc cập nhật test cho hành vi thay đổi.
6. Tự review diff, chạy validation phù hợp, rồi cập nhật tài liệu liên quan.
7. Push nhánh và mở pull request với mô tả đầy đủ.

Nếu sửa API hoặc convention Next.js, đọc guide tương ứng trong
`web/node_modules/next/dist/docs/` vì dự án dùng Next.js 16.

## Tiêu chuẩn theo loại thay đổi

### Code và giao diện

- Giữ TypeScript type-safe; validate dữ liệu không tin cậy tại boundary hiện có,
  thường bằng Zod.
- Không import module hoặc secret server-only vào Client Component.
- Tái sử dụng design token và component pattern hiện có. Giao diện phải
  responsive, dùng được bằng bàn phím, có focus rõ và tôn trọng
  `prefers-reduced-motion`.
- Không dùng `window.alert`, `window.confirm` hoặc `window.prompt` cho luồng sản
  phẩm; dùng dialog của cppinterview.
- Thêm chuỗi giao diện cho cả `vi` và `en`. Nội dung tiếng Việt dùng “bạn” hoặc
  câu trung tính; không dùng cách xưng hô suồng sã trong sản phẩm.
- Bug fix cần test hồi quy khi có thể. Logic mới cần test cả đường thành công,
  lỗi và edge case có ý nghĩa.

### Lesson, question và bản dịch

- Web chỉ discovery sáu source root theo phiên bản C++ và collection
  `dailycppinterview/` trong bảng trên. Không đưa `python/` hoặc CMake vào
  pipeline đang xuất bản.
- `knowledge.md` cần một heading cấp một và ít nhất một heading cấp hai.
- Question mới bắt đầu ở `draft`; AI draft không tự trở thành `verified`.
- Sửa nội dung question phải tăng version/source hash và làm approval cũ mất
  hiệu lực. Không đổi stable ID hoặc xóa audit history để “sửa nhanh”.
- Bản dịch phải bind exact ID, version và source/content hash; giữ nguyên code,
  taxonomy, schema và enum. Không machine-translate ở runtime.
- Chạy generator từ nguồn và review toàn bộ diff sinh ra; không chỉnh manifest
  bằng tay.
- Với Real-World C++ Interviews, sửa catalog
  `web/content/daily-cpp-interview-source.json` rồi chạy
  `node scripts/generate-daily-cpp-interview.mjs` từ `web/`. Mỗi lesson phải giữ
  đúng `vi.md`, `en.md`, `main.cpp` và một question; 146 revision v1 ban đầu là
  bất biến. Quyền sử dụng của cohort này không tự áp dụng cho nguồn bổ sung, nên
  mọi nguồn mới phải có provenance và căn cứ sử dụng riêng trước khi nhập.

### Database, API và bảo mật

- Migration là append-only. Không sửa migration đã áp dụng; thêm file timestamp
  mới và giữ thứ tự rollout được ghi trong development guide.
- Schema/RLS/RPC/auth, input handling, paid-AI admission và secret boundary cần
  security review riêng trước merge.
- Giữ RLS theo nguyên tắc quyền tối thiểu. Browser không được nhận service-role,
  admin, code-runner hoặc provider key.
- Không chạy migration, deploy, `content:sync`, DB generation hoặc AI generation
  chỉ để kiểm tra pull request. Đây là external mutation và cần maintainer cho
  phép rõ ràng.
- Thay đổi có migration phải mô tả tương thích trước/sau migration, thứ tự
  rollout và rollback/fail-closed behavior trong pull request.

## Dùng AI hoặc công cụ sinh mã

AI-assisted contribution được chấp nhận, nhưng người gửi vẫn chịu hoàn toàn
trách nhiệm:

- hiểu và tự review từng thay đổi trước khi gửi;
- tự xác minh correctness, security, license và nguồn của code/nội dung;
- không gửi hàng loạt output chưa kiểm tra hoặc dùng AI review thay cho human
  judgement;
- có khả năng giải thích, sửa và bảo trì phần đã gửi;
- ghi trong pull request nếu AI tạo hoặc viết lại một phần đáng kể của code,
  test, tài liệu hay bản dịch.

Không đưa prompt chứa secret, dữ liệu người dùng hoặc tài liệu không có quyền sử
dụng vào dịch vụ AI bên ngoài. Nội dung sinh bởi AI phải đạt cùng tiêu chuẩn
kiểm thử và review như nội dung do người viết trực tiếp.

## Validation

Chạy command từ `web/`.

| Phạm vi | Validation tối thiểu |
|---|---|
| Tài liệu thuần | Kiểm tra link, command và nội dung liên quan; chạy `npm run context:check` nếu chạm handoff |
| Logic thuần | Test liên quan và `npm run typecheck` |
| UI, route hoặc API | ESLint, typecheck, test liên quan và browser smoke phù hợp |
| Lesson/question/schema content | `npm run content:refresh`, review diff, `npm run content:status`, test content |
| Evidence/grading contract | Test liên quan và `npm run eval:evidence` |
| Trước khi merge thay đổi project | `npm run context:refresh`, sau đó `npm run validate` |

`npm run validate` chạy content/context check, lint, typecheck, toàn bộ Vitest và
production build. CI phải xanh, nhưng CI không thay thế validation và self-review
tại máy người gửi.

Sau mọi thay đổi code, test, lesson, tooling, config, schema, migration hoặc CI:

1. chạy `npm run context:refresh`;
2. cập nhật file semantic phù hợp trong `docs/ai-context/` nếu behavior, kiến
   trúc, command, deployment, invariant hoặc trạng thái xác minh thay đổi;
3. chạy `npm run context:check`;
4. commit generated snapshot cùng thay đổi.

Ghi chính xác lệnh đã chạy và kết quả. Nếu chưa chạy một gate, nói rõ lý do;
không ghi “all tests pass” dựa trên suy đoán.

## Commit

Repository dùng subject ngắn theo Conventional Commit:

```text
feat: add focused review filter
fix: preserve locale query during navigation
docs: add contribution workflow
test: cover stale question revisions
refactor: isolate progress merge policy
perf: reduce practice navigation latency
chore: update development tooling
```

Dùng thể mệnh lệnh, không chấm cuối subject và giữ mỗi commit có một ý nghĩa rõ.
Body, khi cần, giải thích “vì sao” và trade-off thay vì lặp lại diff. Không đưa
secret, stack trace chứa dữ liệu riêng hoặc `@mention` không cần thiết vào commit.

## Pull request

Pull request tốt cần có:

- vấn đề và lý do thay đổi;
- giải pháp cùng phần cố ý không làm;
- issue liên quan, nếu có;
- test/validation đã chạy với kết quả chính xác;
- ảnh hoặc video trước/sau cho thay đổi UI ở mobile và desktop;
- ảnh hưởng tới accessibility, performance, security hoặc dữ liệu;
- migration/rollout/rollback nếu liên quan;
- disclosure AI đáng kể theo phần trên.

Trước khi xin review, xác nhận:

- [ ] Diff chỉ chứa thay đổi cùng phạm vi.
- [ ] Không có secret, dữ liệu cá nhân hoặc file local/generated ngoài ý muốn.
- [ ] Test mới khóa hành vi quan trọng hoặc lý do không thêm test đã được nêu.
- [ ] UI/content mới đã xử lý cả tiếng Việt và tiếng Anh khi áp dụng.
- [ ] AI handoff và generated snapshot khớp với code.
- [ ] Validation đã ghi đúng những gì thực sự chạy.
- [ ] Branch đã cập nhật với `main` và CI không có lỗi liên quan.

Để pull request ở trạng thái draft nếu implementation, test, migration plan hoặc
self-review chưa hoàn tất. Phản hồi review bằng thay đổi có mục tiêu; không trộn
refactor mới vào vòng sửa review nếu nó không cần cho pull request.

## Nguồn tham khảo

Hướng dẫn này tổng hợp các nguyên tắc phổ biến rồi điều chỉnh theo contract của
cppinterview; nó không sao chép CLA, signed-commit hay governance riêng của dự
án khác:

- [Next.js contributing guide](https://github.com/vercel/next.js/blob/canary/contributing.md)
  — tìm issue/PR trùng, thống nhất feature trước và mô tả mục đích rõ;
- [Kubernetes pull request process](https://www.kubernetes.dev/docs/guide/pull-requests/)
  — PR nhỏ, tách thay đổi không liên quan, kiểm thử và commit dễ review;
- [React/Meta pull request conventions](https://github.com/facebookresearch/ProgramBench/blob/main/CONTRIBUTING.md)
  — branch từ `main`, thêm test, cập nhật tài liệu và chạy lint;
- [Rust contributor and LLM guidance](https://github.com/rust-lang/rust/blob/main/CONTRIBUTING.md)
  — tài liệu theo đúng module, self-review và trách nhiệm khi dùng AI;
- [Kubernetes contribution quality guidance](https://github.com/kubernetes/community/blob/main/github-management/github-moderation.md)
  — chất lượng kỹ thuật, bản quyền và khả năng phản hồi review.

Quy tắc trong repository này luôn là nguồn quyết định cuối cùng cho
cppinterview.
