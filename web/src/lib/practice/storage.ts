export const PRACTICE_PROGRESS_STORAGE_KEY = "cpp-recall:progress:v1";
export const EMPTY_PROGRESS_STORAGE_SNAPSHOT = "__empty__";

const PRACTICE_PROGRESS_CHANGED_EVENT = "recall:practice-progress-changed";

export function readPracticeProgressSnapshot() {
  try {
    return (
      window.localStorage.getItem(PRACTICE_PROGRESS_STORAGE_KEY) ??
      EMPTY_PROGRESS_STORAGE_SNAPSHOT
    );
  } catch {
    return EMPTY_PROGRESS_STORAGE_SNAPSHOT;
  }
}

export function writePracticeProgressSnapshot(raw: string) {
  window.localStorage.setItem(PRACTICE_PROGRESS_STORAGE_KEY, raw);
  window.dispatchEvent(new Event(PRACTICE_PROGRESS_CHANGED_EVENT));
}

export function subscribeToPracticeProgress(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      event.key === PRACTICE_PROGRESS_STORAGE_KEY
    ) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PRACTICE_PROGRESS_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PRACTICE_PROGRESS_CHANGED_EVENT, callback);
  };
}
