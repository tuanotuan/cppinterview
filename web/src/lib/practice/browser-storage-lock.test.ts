import { describe, expect, it } from "vitest";

import {
  browserStorageLocksSupported,
  withBrowserStorageLock,
  type BrowserLockManager,
} from "./browser-storage-lock";

describe("browser storage lock", () => {
  it("runs mutations under an account-scoped exclusive Web Lock", async () => {
    const calls: Array<{
      name: string;
      mode: string;
    }> = [];
    const manager: BrowserLockManager = {
      request: async (name, options, callback) => {
        calls.push({ name, mode: options.mode });
        return callback();
      },
    };

    await expect(
      withBrowserStorageLock(
        "recall:test-key",
        () => 42,
        manager,
      ),
    ).resolves.toBe(42);
    expect(calls).toEqual([
      {
        name: "recall:storage:recall:test-key",
        mode: "exclusive",
      },
    ]);
  });

  it("keeps a deterministic fallback when Web Locks are unavailable", async () => {
    await expect(
      withBrowserStorageLock(
        "recall:test-key",
        () => "fallback",
        null,
      ),
    ).resolves.toBe("fallback");
    expect(browserStorageLocksSupported(null)).toBe(false);
  });

  it("reports when an exclusive lock manager can protect first exposure", () => {
    const manager: BrowserLockManager = {
      request: async (_name, _options, callback) => callback(),
    };

    expect(browserStorageLocksSupported(manager)).toBe(true);
  });
});
