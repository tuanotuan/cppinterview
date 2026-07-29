# Recall

Recall là ứng dụng Next.js để học bằng thẻ ghi nhớ và luyện phỏng vấn kỹ thuật.
Nguồn bài học đang được theo dõi nằm trong `cpp98_foundation/`, `cpp11/`,
`cpp20/` và `python/`; pipeline cũng hỗ trợ source root `cmake/` tùy chọn.
Ứng dụng phải tiếp tục nằm trong `web/` để công cụ nội dung tìm đúng các nguồn
này.

## Chức năng chính

- Lịch ôn kiểu Anki, học theo bộ thẻ, lưu cục bộ và đồng bộ Supabase tùy chọn.
- Trợ lý AI có luồng Trợ giúp → Làm lại, hàng đợi ôn lỗi và thẻ sửa lỗi chờ
  duyệt.
- Trung tâm chuẩn bị WorldQuant với Nhiệm vụ hằng ngày, lộ trình kiến thức, bài
  luyện tình huống, vòng phỏng vấn đầy đủ và phỏng vấn thử theo vị trí.
- Hướng dẫn CMake và dữ liệu tick/order book, thống kê học tập, trang cá nhân và
  khu vực quản trị nội dung.
- Pipeline nội dung có ID ổn định, hash nguồn, duyệt đúng phiên bản, manifest
  xác định và kho câu hỏi Supabase giữ lịch sử bất biến.

Số lượng bài, câu hỏi, route, migration và phiên bản dependency hiện tại nằm
trong [`../docs/ai-context/GENERATED_SNAPSHOT.md`](../docs/ai-context/GENERATED_SNAPSHOT.md);
không chép lại các số liệu đó tại đây vì chúng thay đổi thường xuyên.

## Chạy cục bộ

```powershell
cd web
npm ci
Copy-Item .env.example .env.local
npm run content:refresh
npm run dev
```

Không có cấu hình Supabase, phần học cục bộ vẫn hoạt động. AI, đồng bộ đám mây,
lịch sử phỏng vấn và code runner chỉ hoạt động khi có đúng cấu hình server tương
ứng trong `.env.local`. Không đưa service-role key hoặc secret của code runner
vào biến `NEXT_PUBLIC_*` hay mã phía trình duyệt.

Chạy toàn bộ cổng kiểm tra trước khi bàn giao:

```powershell
npm run context:refresh
npm run validate
```

## Tài liệu chuẩn

- Bắt đầu session AI: [`../AI_START_HERE.md`](../AI_START_HERE.md)
- Kiến trúc và nơi sở hữu mã:
  [`../docs/ai-context/PROJECT_MAP.md`](../docs/ai-context/PROJECT_MAP.md)
- Lệnh, môi trường, CI và quy tắc phát triển:
  [`../docs/ai-context/DEVELOPMENT.md`](../docs/ai-context/DEVELOPMENT.md)
- Trạng thái, giới hạn và việc đang bàn giao:
  [`../docs/ai-context/CURRENT_STATE.md`](../docs/ai-context/CURRENT_STATE.md)
- Quy ước bài học và câu hỏi: [`content/README.md`](content/README.md)
- Thiết lập và migration Supabase: [`supabase/README.md`](supabase/README.md)

Các tài liệu trên không chứng minh trạng thái deploy, secret hay migration trên
môi trường từ xa; phải kiểm tra hệ thống bên ngoài khi công việc cần các dữ kiện
đó.
