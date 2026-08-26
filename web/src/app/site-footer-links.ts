export const footerPrimaryLinks = [
  { href: "/practice?guest=1", labelKey: "footer.today" },
  { href: "/learn", labelKey: "nav.library" },
  { href: "/mock-interview", labelKey: "footer.mock" },
  { href: "/stats", labelKey: "footer.progress" },
  { href: "/profile", labelKey: "footer.profile" },
] as const;

export const footerAccountLinks = [
  { href: "/auth", labelKey: "footer.signIn" },
  { href: "/auth?mode=signup", labelKey: "footer.signUp" },
  { href: "/auth/reset-password", labelKey: "footer.forgotPassword" },
] as const;

export const footerExternalLinks = [
  {
    href: "https://github.com/tuanotuan/cppinterview",
    labelKey: "footer.github",
  },
  {
    href: "https://www.facebook.com/CNTT.HCMUS.K23",
    labelKey: "footer.facebook",
  },
] as const;

