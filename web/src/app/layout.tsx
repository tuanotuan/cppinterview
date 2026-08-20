import type { Metadata } from "next";

import "./globals.css";
import { AdminMobileUsageTracker } from "./admin-mobile-usage-tracker";
import { RecallMobileNav } from "./recall-mobile-nav";
import { SiteFooter } from "./site-footer";

export const metadata: Metadata = {
  title: "cppinterview — Luyện phỏng vấn mỗi ngày",
  description: "Luyện phỏng vấn C++ với ngân hàng câu hỏi đã được duyệt, AI coach và mock interview.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="min-h-full pb-22 lg:pb-0">
        {children}
        <SiteFooter />
        <AdminMobileUsageTracker />
        <RecallMobileNav />
      </body>
    </html>
  );
}
