export const footerCreatorHandle = "tuanotuan";

export const footerContactLinks = [
  {
    kind: "github",
    href: "https://github.com/tuanotuan/",
    labelKey: "footer.github",
    external: true,
  },
  {
    kind: "facebook",
    href: "https://www.facebook.com/CNTT.HCMUS.K23",
    labelKey: "footer.facebook",
    external: true,
  },
  {
    kind: "email",
    href: "mailto:tuan.hcmus77@gmail.com",
    labelKey: "footer.email",
    external: false,
  },
] as const;

export type FooterContactKind = (typeof footerContactLinks)[number]["kind"];
