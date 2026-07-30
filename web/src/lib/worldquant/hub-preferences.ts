import { z } from "zod";

export const EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT =
  "__empty_worldquant_hub_preferences__";

const WORLDQUANT_HUB_PREFERENCES_CHANGED_EVENT =
  "recall:worldquant-hub-changed";

export function worldQuantHubPreferencesStorageKey(
  accountId: string | null,
) {
  const scope = accountId ? z.string().uuid().parse(accountId) : "local";
  return `recall:worldquant-hub:${scope}:v2`;
}

export function readWorldQuantHubPreferencesSnapshot(
  accountId: string | null,
) {
  try {
    return (
      window.localStorage.getItem(
        worldQuantHubPreferencesStorageKey(accountId),
      ) ?? EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT
    );
  } catch {
    return EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT;
  }
}

export function writeWorldQuantHubPreferencesSnapshot(
  accountId: string | null,
  raw: string,
) {
  try {
    const storageKey = worldQuantHubPreferencesStorageKey(accountId);
    window.localStorage.setItem(storageKey, raw);
    window.dispatchEvent(
      new CustomEvent(WORLDQUANT_HUB_PREFERENCES_CHANGED_EVENT, {
        detail: { storageKey },
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function subscribeToWorldQuantHubPreferences(
  accountId: string | null,
  callback: () => void,
) {
  const storageKey = worldQuantHubPreferencesStorageKey(accountId);
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      event.key === storageKey
    ) {
      callback();
    }
  };
  const onChanged = (event: Event) => {
    const detail = (
      event as CustomEvent<{ storageKey?: string }>
    ).detail;
    if (detail?.storageKey === storageKey) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(
    WORLDQUANT_HUB_PREFERENCES_CHANGED_EVENT,
    onChanged,
  );
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(
      WORLDQUANT_HUB_PREFERENCES_CHANGED_EVENT,
      onChanged,
    );
  };
}
