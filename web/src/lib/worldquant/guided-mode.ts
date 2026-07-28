import { z } from "zod";

import {
  worldQuantRoleProfileIds,
  type WorldQuantRoleProfileId,
} from "./readiness";

export const WORLDQUANT_GUIDED_MODE_VERSION = 1 as const;
export const WORLDQUANT_GUIDED_MODE_STORAGE_PREFIX =
  "recall:worldquant-guided:v1";

export type WorldQuantGuidedModeState = {
  version: typeof WORLDQUANT_GUIDED_MODE_VERSION;
  onboardingCompletedAt: string | null;
};

export type WorldQuantMissionStep<T> = {
  item: T;
  position: number;
  total: number;
};

const FIRST_VISIT_GUIDED_MODE_STATE: WorldQuantGuidedModeState = {
  version: WORLDQUANT_GUIDED_MODE_VERSION,
  onboardingCompletedAt: null,
};

export function worldQuantGuidedModeStorageKey(accountId: string | null) {
  const scope = accountId ? z.string().uuid().parse(accountId) : "local";
  return `${WORLDQUANT_GUIDED_MODE_STORAGE_PREFIX}:${scope}`;
}

export function parseWorldQuantGuidedModeState(
  raw: string | null,
): WorldQuantGuidedModeState {
  if (!raw) return FIRST_VISIT_GUIDED_MODE_STATE;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      value.version !== WORLDQUANT_GUIDED_MODE_VERSION ||
      (value.onboardingCompletedAt !== null &&
        (typeof value.onboardingCompletedAt !== "string" ||
          !Number.isFinite(Date.parse(value.onboardingCompletedAt))))
    ) {
      return FIRST_VISIT_GUIDED_MODE_STATE;
    }
    return {
      version: WORLDQUANT_GUIDED_MODE_VERSION,
      onboardingCompletedAt: value.onboardingCompletedAt,
    };
  } catch {
    return FIRST_VISIT_GUIDED_MODE_STATE;
  }
}

export function completeWorldQuantGuidedOnboarding(
  completedAt = new Date().toISOString(),
): WorldQuantGuidedModeState {
  const timestamp = new Date(completedAt);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new Error("Invalid onboarding completion timestamp");
  }
  return {
    version: WORLDQUANT_GUIDED_MODE_VERSION,
    onboardingCompletedAt: timestamp.toISOString(),
  };
}

export function serializeWorldQuantGuidedModeState(
  state: WorldQuantGuidedModeState,
) {
  const validated = parseWorldQuantGuidedModeState(JSON.stringify(state));
  if (validated.onboardingCompletedAt === null) {
    throw new Error("Cannot persist an incomplete guided onboarding state");
  }
  return JSON.stringify(validated);
}

export function normalizeWorldQuantMissionMinutes(value: number) {
  if (!Number.isFinite(value)) return 45;
  return Math.min(120, Math.max(15, Math.round(value / 15) * 15));
}

export function worldQuantGuidedMissionHref(
  roleId: WorldQuantRoleProfileId,
  minutes: number,
) {
  const search = new URLSearchParams({
    role: roleId,
    minutes: String(normalizeWorldQuantMissionMinutes(minutes)),
  });
  return `/worldquant/mission?${search.toString()}`;
}

export function withWorldQuantMissionReturn(
  href: string,
  roleId: WorldQuantRoleProfileId,
  minutes: number,
) {
  const url = new URL(href, "https://recall.local");
  if (url.origin !== "https://recall.local") {
    throw new Error("Guided return only supports internal destinations");
  }
  url.searchParams.set("returnTo", "worldquant-mission");
  url.searchParams.set("returnRole", roleId);
  url.searchParams.set(
    "returnMinutes",
    String(normalizeWorldQuantMissionMinutes(minutes)),
  );
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseWorldQuantMissionReturn({
  returnTo,
  role,
  minutes,
}: {
  returnTo: string | undefined;
  role: string | undefined;
  minutes: string | undefined;
}) {
  if (
    returnTo !== "worldquant-mission" ||
    !worldQuantRoleProfileIds.includes(role as WorldQuantRoleProfileId)
  ) {
    return null;
  }
  if (!minutes?.trim()) return null;
  const parsedMinutes = Number(minutes);
  if (
    !Number.isFinite(parsedMinutes) ||
    !Number.isInteger(parsedMinutes) ||
    parsedMinutes < 15 ||
    parsedMinutes > 120 ||
    parsedMinutes % 15 !== 0
  ) {
    return null;
  }
  return worldQuantGuidedMissionHref(
    role as WorldQuantRoleProfileId,
    parsedMinutes,
  );
}

export function nextWorldQuantMissionStep<
  T extends { id: string; kind: string },
>(
  items: readonly T[],
  completedIds: ReadonlySet<string>,
): WorldQuantMissionStep<T> | null {
  const actionable = items.filter((item) => item.kind !== "content_gap");
  const nextIndex = actionable.findIndex(
    (item) => !completedIds.has(item.id),
  );
  if (nextIndex < 0) return null;
  return {
    item: actionable[nextIndex],
    position: nextIndex + 1,
    total: actionable.length,
  };
}

export function isWorldQuantMissionComplete<
  T extends { id: string; kind: string },
>(
  items: readonly T[],
  completedIds: ReadonlySet<string>,
) {
  const actionable = items.filter((item) => item.kind !== "content_gap");
  return (
    actionable.length > 0 &&
    !items.some((item) => item.kind === "content_gap") &&
    actionable.every((item) => completedIds.has(item.id))
  );
}
