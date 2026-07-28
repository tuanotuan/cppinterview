export type BrowserLockManager = {
  request: <T>(
    name: string,
    options: { mode: "exclusive" },
    callback: () => T | PromiseLike<T>,
  ) => Promise<T>;
};

export async function withBrowserStorageLock<T>(
  name: string,
  operation: () => T | PromiseLike<T>,
  lockManager: BrowserLockManager | null = browserLockManager(),
) {
  if (!lockManager) return operation();
  return lockManager.request(
    `recall:storage:${name}`,
    { mode: "exclusive" },
    operation,
  );
}

export function browserStorageLocksSupported(
  lockManager: BrowserLockManager | null = browserLockManager(),
) {
  return lockManager !== null;
}

function browserLockManager() {
  if (typeof navigator === "undefined") return null;
  return (
    navigator as Navigator & {
      locks?: BrowserLockManager;
    }
  ).locks ?? null;
}
