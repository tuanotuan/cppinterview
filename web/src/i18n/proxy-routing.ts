const technicalAuthRoutes = new Set([
  "/auth/callback",
  "/auth/confirm",
  "/auth/login",
  "/auth/logout",
]);

export function shouldBypassI18n(pathname: string) {
  if (pathname === "/api" || pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/worldquant")) return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  return technicalAuthRoutes.has(pathname);
}
