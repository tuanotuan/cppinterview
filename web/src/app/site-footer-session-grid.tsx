"use client";

import { useEffect, useState } from "react";

export type FooterSessionState = "checking" | "guest" | "authenticated";

type FooterSessionGridProps = {
  brand: React.ReactNode;
  guestActions: React.ReactNode;
  connect: React.ReactNode;
};

const guestGridClassName =
  "sm:grid-cols-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(11rem,.55fr)_minmax(11rem,.55fr)]";
const authenticatedGridClassName =
  "sm:grid-cols-[minmax(0,1.55fr)_minmax(11rem,.55fr)]";

export function SiteFooterSessionGrid(props: FooterSessionGridProps) {
  const sessionState = useFooterSessionState();
  return <SiteFooterSessionGridView {...props} sessionState={sessionState} />;
}

export function SiteFooterSessionGridView({
  brand,
  guestActions,
  connect,
  sessionState,
}: FooterSessionGridProps & { sessionState: FooterSessionState }) {
  const showGuestActions = sessionState === "guest";

  return (
    <div
      className={`grid gap-10 py-10 sm:py-12 lg:gap-14 lg:py-16 ${
        showGuestActions ? guestGridClassName : authenticatedGridClassName
      }`}
    >
      <div className={showGuestActions ? "sm:col-span-2 lg:col-span-1" : undefined}>
        {brand}
      </div>
      {showGuestActions ? guestActions : null}
      {connect}
    </div>
  );
}

function useFooterSessionState(): FooterSessionState {
  const [sessionState, setSessionState] =
    useState<FooterSessionState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/auth/status", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Footer auth status unavailable");
        const payload: unknown = await response.json();
        if (!isAuthStatusPayload(payload)) {
          throw new Error("Footer auth status is invalid");
        }
        if (!controller.signal.aborted) {
          setSessionState(payload.authenticated ? "authenticated" : "guest");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setSessionState("guest");
      });

    return () => controller.abort();
  }, []);

  return sessionState;
}

function isAuthStatusPayload(
  value: unknown,
): value is { authenticated: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { authenticated?: unknown }).authenticated === "boolean"
  );
}
