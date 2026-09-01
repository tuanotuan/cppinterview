import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SiteFooterSessionGridView,
  type FooterSessionState,
} from "./site-footer-session-grid";

function renderFooterGrid(sessionState: FooterSessionState) {
  return renderToStaticMarkup(
    <SiteFooterSessionGridView
      sessionState={sessionState}
      brand={<div>Brand</div>}
      guestActions={<div>Guest account actions</div>}
      connect={<div>Connect</div>}
    />,
  );
}

describe("SiteFooterSessionGridView", () => {
  it("omits guest start and account actions while checking or authenticated", () => {
    for (const state of ["checking", "authenticated"] as const) {
      const html = renderFooterGrid(state);

      expect(html).toContain("Brand");
      expect(html).toContain("Connect");
      expect(html).not.toContain("Guest account actions");
    }
  });

  it("renders guest actions only after the account check confirms a guest", () => {
    const html = renderFooterGrid("guest");

    expect(html).toContain("Guest account actions");
    expect(html).toContain("sm:col-span-2 lg:col-span-1");
  });
});
