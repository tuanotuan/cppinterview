export async function submitFrozenMockInterviewReport<T>({
  lockName,
  persistFrozenSession,
  runExclusive = runWithBrowserLock,
  sendReport,
}: {
  lockName: string;
  persistFrozenSession: () => boolean | Promise<boolean>;
  runExclusive?: ExclusiveLockRunner;
  sendReport: () => Promise<T>;
}): Promise<
  | { kind: "storage_conflict" }
  | { kind: "submitted"; response: T }
> {
  const persisted = await runExclusive(
    lockName,
    persistFrozenSession,
  );
  if (!persisted) {
    return { kind: "storage_conflict" };
  }

  return {
    kind: "submitted",
    response: await sendReport(),
  };
}

type ExclusiveLockRunner = <T>(
  name: string,
  operation: () => T | Promise<T>,
) => Promise<T>;

async function runWithBrowserLock<T>(
  name: string,
  operation: () => T | Promise<T>,
): Promise<T> {
  if (
    typeof navigator === "undefined" ||
    !("locks" in navigator) ||
    !navigator.locks
  ) {
    return operation();
  }
  return navigator.locks.request(
    name,
    { mode: "exclusive" },
    operation,
  );
}
