import type { WorldQuantRoleProfileId } from "./readiness";

const INTERNAL_ROUTE_ORIGIN = "https://recall.local";

export function worldQuantRoleHref(
  href: string,
  roleProfileId: WorldQuantRoleProfileId,
) {
  const url = new URL(href, INTERNAL_ROUTE_ORIGIN);
  if (url.origin !== INTERNAL_ROUTE_ORIGIN) {
    throw new Error("WorldQuant navigation only accepts internal routes");
  }
  url.searchParams.set("role", roleProfileId);
  return `${url.pathname}${url.search}${url.hash}`;
}
