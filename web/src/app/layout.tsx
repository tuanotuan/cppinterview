import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Recall — Luyện phỏng vấn mỗi ngày",
  description: "Ôn phỏng vấn C++, Python và CMake từ chính kho ghi chú của bạn.",
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
