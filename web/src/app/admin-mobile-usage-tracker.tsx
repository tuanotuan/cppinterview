"use client";

import { useEffect } from "react";

const heartbeatIntervalMs = 25_000;
const sessionStorageKey = "recall.admin.mobile-usage.session.v1";

/**
 * Records only observed, visible active time from a phone browser. The API
 * performs the real admin check, so this component never exposes identity or
 * tracking data to other accounts.
 */
export function AdminMobileUsageTracker() {
  useEffect(() => {
    if (!isPhoneBrowser()) return;

    const sessionId = sessionIdForTab();
    if (!sessionId) return;
    let stopped = false;

    const heartbeat = ({
      keepalive = false,
      includeTrailingActiveTime = false,
    }: {
      keepalive?: boolean;
      includeTrailingActiveTime?: boolean;
    } = {}) => {
      if (stopped) return;
      if (
        !includeTrailingActiveTime &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      void fetch("/api/profile/mobile-usage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
        keepalive,
        credentials: "same-origin",
      })
        .then((response) => {
          // Anonymous and non-admin visitors should make no repeated calls.
          if (response.status === 401 || response.status === 403) stopped = true;
        })
        .catch(() => {
          // Tracking is optional; a transient network failure must never affect learning.
        });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        heartbeat();
        return;
      }
      heartbeat({ keepalive: true, includeTrailingActiveTime: true });
    };
    const onBlur = () =>
      heartbeat({ keepalive: true, includeTrailingActiveTime: true });
    const onFocus = () => heartbeat();
    const onPageHide = () =>
      heartbeat({ keepalive: true, includeTrailingActiveTime: true });

    heartbeat();
    const interval = window.setInterval(heartbeat, heartbeatIntervalMs);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}

function isPhoneBrowser() {
  return /Android.+Mobile|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

function sessionIdForTab() {
  try {
    const existing = window.sessionStorage.getItem(sessionStorageKey);
    if (existing) return existing;
    const sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(sessionStorageKey, sessionId);
    return sessionId;
  } catch {
    return null;
  }
}
