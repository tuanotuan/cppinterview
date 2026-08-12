# Current state

File này chỉ giữ việc đang bàn giao, giới hạn chưa xác minh và validation gần
nhất. Kiến trúc ổn định nằm trong `PROJECT_MAP.md`; command và invariant phát
triển nằm trong `DEVELOPMENT.md`; số liệu máy sinh nằm trong
`GENERATED_SNAPSHOT.md`. Luôn kiểm tra Git trực tiếp ở đầu session, không suy ra
trạng thái từ tên nhánh.

## Handoff hiện tại

- Giao diện Practice/Admin chỉ biểu diễn hai nhãn phân loại của thẻ: `Dễ`/`Trung bình`/`Khó` và `Text`/`Code`. Filter theo bộ thẻ, lộ trình, loại câu và chủ đề đã được gỡ khỏi UI; taxonomy và `type` vẫn nằm trong data model để scheduler, tạo nội dung và WorldQuant/mock dùng nội bộ.

- Câu hỏi thủ công trong Admin dùng DB-native revision/audit, không phải override của question Git. Form chỉ cần đề bài và đáp án tham khảo; lesson nội bộ không có file `.md` giữ revision/approval và không bị repository sync archive. Migration `20260809100000_create_standalone_admin_manual_questions.sql` phải chạy sau khi deploy app mới; trước đó API fail an toàn và không tạo row nào.

- Luna “Làm rõ câu hỏi” hiện dành cho admin `tuanotuan` trên Practice. Route dùng budget ledger sẵn có, không cần migration hay biến môi trường mới; prompt chỉ nhận đề và mã trong đề, không nhận đáp án/rubric/tài liệu nguồn. Kết quả nói nôm na bằng tình huống gần gũi, không dựng từ điển thuật ngữ; dữ liệu local cũ vẫn đọc được và kết quả lưu theo exact question version/hash để tồn tại qua F5.

- Nhánh hiện hành bổ sung thống kê riêng cho admin `tuanotuan`: thời gian Recall
  hoạt động trên điện thoại hôm nay, 7 ngày và 30 ngày. Migration
  `20260806100000_create_admin_mobile_usage.sql` chưa được áp dụng lên Supabase;
  app phải deploy trước rồi mới chạy migration. Bộ đếm chỉ cộng heartbeat quan
  sát được của tab phone đang visible, không thu thập IP/user-agent/URL.
- Đợt nâng cấp đang gom sáu chức năng học tập: phiên ôn tập trọng tâm từ
  Stats/thư viện bài học; Tick Replay Lab; thư viện bài học có
  tự kiểm tra; Toolchain Dojo; Legacy → Modern C++ Capstone; và đồng bộ nền cho
  bằng chứng WorldQuant cùng Nhiệm vụ. Capstone là sáu checkpoint tuần tự về
  provenance, golden output, adapter, toolchain, reconciliation và rollout.
- Training state vẫn lưu tại máy trước để dùng được khi mất mạng. Khi tài khoản đã
  đăng nhập, state account-scoped được hợp nhất với cloud bằng revision CAS; dữ liệu
  anonymous không tự chuyển vào tài khoản. Mission cloud giữ bản đầu tiên theo
  ngày/vị trí/thời lượng để các thiết bị dùng cùng một kế hoạch; nếu cloud lỗi,
  bản trên thiết bị vẫn là bản làm việc.

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
- Migration `20260801090000_add_worldquant_cloud_state.sql` mới có hai bảng/RPC
  cloud state và chưa được xác minh trên Supabase production. Triển khai app mới
  trước, sau đó mới chạy migration; khi migration chưa có, API trả lỗi an toàn và
  browser tiếp tục giữ tiến độ cục bộ.
- Hồ sơ phỏng vấn WorldQuant hiện hành là v4, local snapshot nằm dưới exact
  account UUID và danh mục bài luyện là v2. Mọi transition dùng Web Lock +
  revision CAS; answer intent chỉ được rebase trong cùng session/status, còn
  freeze/complete/reset giữ CAS nghiêm ngặt. Phiên đúng owner nhưng stale theo
  question revision được thay nguyên tử khi tạo buổi mới. Hub chỉ đọc local v4
  theo account hoặc server history v4; không nhận shared v3/ownerless state.
- Supabase project `cpp-recall` đã áp đủ migration đến `20260730220000`; lịch
  sử remote đã được đối chiếu với local. Bootstrap xử lý hai view cũ không có
  lịch sử (`content_current_questions` và
  `content_current_repository_questions`) bằng drop tường minh không
  `CASCADE`, và xoá riêng metadata `current_standard` cache không hợp lệ để
  content sync điền lại từ manifest. Repo vẫn không chứng minh trạng thái
  deploy Vercel, `QUESTION_STORE`, secret hay quota production.
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
- Thao tác xác nhận, xóa, reset hay nhập metadata trong client phải dùng dialog
  của Recall; không quay lại hộp thoại native `alert`/`confirm`/`prompt` vì chúng
  thiếu ngữ cảnh và phá vỡ trải nghiệm trên mobile.
- Đợt UI hiện tại đã có shell mobile và Today workspace trên `/`, cùng session
  rail/sticky action trong Mock. Thư viện hiển thị tổng quan nguồn học và chip
  lọc lộ trình; Admin/Hồ sơ ưu tiên lối vào học tập chính. Các thay đổi này
  không chạm scheduler, AI admission hay dữ liệu học.
- UI dùng chung có reduced-motion fallback; skeleton loading có thông báo cho
  screen reader và thanh điều hướng mobile giữ vùng chạm/focus rõ ràng.
- Trang chủ `/` luôn là landing giới thiệu Recall; `/auth` hỗ trợ email/mật khẩu
  và GitHub OAuth, còn workspace Today nằm ở `/practice` cho cả local practice
  lẫn account đã đăng nhập. Đăng ký email cần xác nhận mật khẩu phía browser và
  server; nút hiện/ẩn dùng chung cho cả hai ô mật khẩu, rồi xác minh email qua
  `/auth/confirm`.
- CTA “Thử luyện không cần tài khoản” mở `/practice?guest=1`: vẫn luyện thẻ
  local nhưng header không hiện lời mời đăng nhập như một điều kiện bắt buộc.
- Guest mode mở Luna AI Coach mà không cần tài khoản, qua giới hạn public ba
  lượt/24 giờ. Practice đọc quota hiệu dụng theo IP/device/account khi tải trang
  và cập nhật lại từ route sau mỗi lượt; trạng thái chưa đọc được không được giả
  thành `3/3`. Mở đáp án, gợi ý và đánh giá local vẫn dùng được.
- Câu trả lời trống nghĩa là chưa biết và vẫn gọi được AI. Luồng
  Trợ giúp → Làm lại khóa rating cho tới khi người học tự trả lời lại; retry và
  Recall Repair vẫn đi qua scheduler chuẩn, không tạo review trùng.
- Contribution graph `/profile` đọc review, coach attempt và mock attempt đã
  hoàn tất qua RLS; không gọi AI, không tạo bảng activity và không trừ quota.
- WorldQuant coverage, learning evidence và mock evidence là ba tín hiệu khác
  nhau. Draft, personal remediation hoặc content gap không được biến thành điểm
  yếu hay bằng chứng đã xác nhận.

## Public AI quota rollout

- Public Luna admission is working in production after the response-shape and
  UUIDv8 fixes. The original RPC enforces IP, device, and optional account
  independently, but returned a device-only counter; Practice also rendered an
  unknown initial snapshot as a false `3/3`.
- The current change adds
  `20260809120000_add_public_ai_quota_status.sql`: server-side Practice hydration
  reads the effective minimum allowance, and admission v2 returns the same
  effective counter after reserve. A fresh incognito profile has no device
  cookie but still reads/enforces the HMAC network identity; no fingerprint is
  collected. Deploy the compatible app first, then apply this migration and
  smoke-test a second incognito profile on the same network. Before migration,
  admission falls back to the enforcing v1 RPC and the UI shows “Đang kiểm tra”
  instead of claiming a fresh limit.

## Validation gần nhất

- Mobile usage cho admin dùng `document.visibilityState`, không dùng
  `document.hasFocus()` vì Safari/Chrome mobile có thể trả về false khi tab vẫn
  đang hiện. Heartbeat fix đạt typecheck, ESLint các file liên quan và targeted
  profile test; migration `20260806100000_create_admin_mobile_usage.sql` đã là
  điều kiện để production ghi số liệu.
- Public AI effective-quota hydration đạt targeted 33/33 test và full validation:
  content/context check, lint, typecheck, 106 file/663 Vitest test, cùng Next.js
  production build 63 route. Sau merge/deploy vẫn phải chạy migration
  `20260809120000_add_public_ai_quota_status.sql`, rồi smoke-test hai profile ẩn
  danh mới trên cùng mạng để xác nhận lượt thứ hai đọc lại đúng counter IP.
- Mở quyền Recall qua email/mật khẩu và GitHub OAuth đạt `content:check`,
  `context:check`, ESLint, TypeScript, 107 file/661 Vitest test và Next.js
  production build 64 route. Đăng ký mới cần Email provider/Site URL/Redirect
  URLs của Supabase đúng như `web/supabase/README.md`; GitHub `tuanotuan` vẫn là
  điều kiện bất biến duy nhất cho quyền Admin. Cảnh báo retry tác vụ AI vẫn được
  kiểm thử như một contract vì người dùng phải thấy rõ khả năng phát sinh chi
  phí; toàn bộ client không còn gọi `window.alert`/`confirm`/`prompt`.
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
