import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // Dynamic page segments otherwise have a zero-second router-cache lifetime.
    // A short window makes repeat navigation responsive while server mutations
    // and session cookie changes still invalidate the client cache immediately.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default withNextIntl(nextConfig);
