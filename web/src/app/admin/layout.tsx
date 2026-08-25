import "../globals.css";

import { AdminMobileUsageTracker } from "../admin-mobile-usage-tracker";

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full">
        <a className="skip-link" href="#main-content">
          Đi đến nội dung chính
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <AdminMobileUsageTracker />
      </body>
    </html>
  );
}
