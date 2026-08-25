import type { Metadata } from "next";

import type { Locale } from "./routing";
import { localizeHref } from "./routing";

export function localizedAlternates(pathname: string, locale: Locale): Metadata["alternates"] {
  return {
    canonical: localizeHref(pathname, locale),
    languages: {
      vi: localizeHref(pathname, "vi"),
      en: localizeHref(pathname, "en"),
      "x-default": localizeHref(pathname, "vi"),
    },
  };
}
