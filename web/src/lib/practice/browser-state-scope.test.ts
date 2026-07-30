import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorldQuantFocusPlan } from "../worldquant/focus-plan";
import {
  EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT,
  readWorldQuantHubPreferencesSnapshot,
  subscribeToWorldQuantHubPreferences,
  worldQuantHubPreferencesStorageKey,
  writeWorldQuantHubPreferencesSnapshot,
} from "../worldquant/hub-preferences";
import {
  EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT,
  createFocusSession,
  focusSessionStorageKey,
  readFocusSessionSnapshot,
  subscribeToFocusSession,
  writeFocusSessionSnapshot,
} from "./focus-session";
import {
  EMPTY_PROGRESS_STORAGE_SNAPSHOT,
  practiceProgressStorageKey,
  readPracticeProgressSnapshot,
  subscribeToPracticeProgress,
  writePracticeProgressSnapshot,
} from "./storage";
import { savedItemsStorageKey } from "./saved-items";
import { studySessionStorageKey } from "./study-session";

const accountA = "10000000-0000-4000-8000-000000000001";
const accountB = "10000000-0000-4000-8000-000000000002";
const sessionId = "10000000-0000-4000-8000-000000000003";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class BrowserWindow extends EventTarget {
  constructor(readonly localStorage: Storage) {
    super();
  }
}

const focusPlan: WorldQuantFocusPlan = {
  version: 1,
  profileId: "tick-data-platform",
  profileVersion: 1,
  createdOn: "2026-07-29",
  focusCompetency: "modern_cpp",
  requestedMinutes: 15,
  budgetCeilingMinutes: 16,
  scheduledMinutes: 5,
  questions: [
    {
      question: {
        id: "account-isolated-card",
        version: 1,
        sourceHash: "a".repeat(64),
        deckId: "cpp-interview",
        estimatedMinutes: 5,
      },
      competency: "modern_cpp",
      queueReason: "new",
      evidence: 0,
    },
  ],
  fallbacks: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("account-scoped browser state", () => {
  it("uses separate v2 keys for account A, account B, and local mode", () => {
    expect(
      new Set([
        practiceProgressStorageKey(accountA),
        practiceProgressStorageKey(accountB),
        practiceProgressStorageKey(null),
      ]).size,
    ).toBe(3);
    expect(
      new Set([
        studySessionStorageKey(accountA),
        studySessionStorageKey(accountB),
        studySessionStorageKey(null),
      ]).size,
    ).toBe(3);
    expect(
      new Set([
        focusSessionStorageKey(accountA),
        focusSessionStorageKey(accountB),
        focusSessionStorageKey(null),
      ]).size,
    ).toBe(3);
    expect(
      new Set([
        savedItemsStorageKey(accountA),
        savedItemsStorageKey(accountB),
        savedItemsStorageKey(null),
      ]).size,
    ).toBe(3);
    expect(
      new Set([
        worldQuantHubPreferencesStorageKey(accountA),
        worldQuantHubPreferencesStorageKey(accountB),
        worldQuantHubPreferencesStorageKey(null),
      ]).size,
    ).toBe(3);
    expect(practiceProgressStorageKey(accountA)).toContain(":v2");
    expect(studySessionStorageKey(accountA)).toContain(":v2");
    expect(focusSessionStorageKey(accountA)).toContain(":v2");
    expect(savedItemsStorageKey(accountA)).toContain(":v2");
    expect(worldQuantHubPreferencesStorageKey(accountA)).toContain(":v2");
  });

  it("ignores all unowned v1 browser-state entries", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal(
      "window",
      new BrowserWindow(storage as unknown as Storage),
    );
    storage.setItem("cpp-recall:progress:v1", "legacy-progress");
    storage.setItem("cpp-recall:study-session:v1", "legacy-draft");
    storage.setItem("recall:focus-session:v1", "legacy-focus");
    storage.setItem("cpp-recall:saved-items:v1", "legacy-saved-items");
    storage.setItem("recall:worldquant-hub:v1", "legacy-hub-preferences");

    expect(readPracticeProgressSnapshot(accountA)).toBe(
      EMPTY_PROGRESS_STORAGE_SNAPSHOT,
    );
    expect(readPracticeProgressSnapshot(null)).toBe(
      EMPTY_PROGRESS_STORAGE_SNAPSHOT,
    );
    expect(readFocusSessionSnapshot(accountA)).toBe(
      EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT,
    );
    expect(readFocusSessionSnapshot(null)).toBe(
      EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT,
    );
    expect(storage.getItem(studySessionStorageKey(accountA))).toBeNull();
    expect(storage.getItem(studySessionStorageKey(null))).toBeNull();
    expect(storage.getItem(savedItemsStorageKey(accountA))).toBeNull();
    expect(storage.getItem(savedItemsStorageKey(null))).toBeNull();
    expect(readWorldQuantHubPreferencesSnapshot(accountA)).toBe(
      EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT,
    );
    expect(readWorldQuantHubPreferencesSnapshot(null)).toBe(
      EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT,
    );
    expect(storage.getItem("cpp-recall:progress:v1")).toBe(
      "legacy-progress",
    );
    expect(storage.getItem("cpp-recall:study-session:v1")).toBe(
      "legacy-draft",
    );
    expect(storage.getItem("recall:focus-session:v1")).toBe(
      "legacy-focus",
    );
    expect(storage.getItem("cpp-recall:saved-items:v1")).toBe(
      "legacy-saved-items",
    );
    expect(storage.getItem("recall:worldquant-hub:v1")).toBe(
      "legacy-hub-preferences",
    );
  });

  it("notifies only the progress subscriber for the written scope", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal(
      "window",
      new BrowserWindow(storage as unknown as Storage),
    );
    const onA = vi.fn();
    const onB = vi.fn();
    const onLocal = vi.fn();
    const unsubscribeA = subscribeToPracticeProgress(accountA, onA);
    const unsubscribeB = subscribeToPracticeProgress(accountB, onB);
    const unsubscribeLocal = subscribeToPracticeProgress(null, onLocal);

    writePracticeProgressSnapshot(accountA, '{"version":1,"reviews":[]}');

    expect(onA).toHaveBeenCalledOnce();
    expect(onB).not.toHaveBeenCalled();
    expect(onLocal).not.toHaveBeenCalled();
    expect(readPracticeProgressSnapshot(accountB)).toBe(
      EMPTY_PROGRESS_STORAGE_SNAPSHOT,
    );
    const crossTabEvent = new Event("storage");
    Object.defineProperties(crossTabEvent, {
      key: { value: practiceProgressStorageKey(accountB) },
      storageArea: { value: storage },
    });
    window.dispatchEvent(crossTabEvent);
    expect(onA).toHaveBeenCalledOnce();
    expect(onB).toHaveBeenCalledOnce();
    expect(onLocal).not.toHaveBeenCalled();
    unsubscribeA();
    unsubscribeB();
    unsubscribeLocal();
  });

  it("isolates Focus subscribers and rejects a session under the wrong account key", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal(
      "window",
      new BrowserWindow(storage as unknown as Storage),
    );
    const onA = vi.fn();
    const onB = vi.fn();
    const unsubscribeA = subscribeToFocusSession(accountA, onA);
    const unsubscribeB = subscribeToFocusSession(accountB, onB);
    const sessionA = createFocusSession(focusPlan, {
      accountId: accountA,
      now: "2026-07-29T02:00:00.000Z",
      sessionId,
    });

    writeFocusSessionSnapshot(accountA, sessionA);

    expect(onA).toHaveBeenCalledOnce();
    expect(onB).not.toHaveBeenCalled();
    expect(readFocusSessionSnapshot(accountB)).toBe(
      EMPTY_FOCUS_SESSION_STORAGE_SNAPSHOT,
    );
    expect(() =>
      writeFocusSessionSnapshot(accountB, sessionA),
    ).toThrow(/account scope/i);
    expect(storage.getItem(focusSessionStorageKey(accountB))).toBeNull();
    unsubscribeA();
    unsubscribeB();
  });

  it("isolates Readiness Hub preferences and their subscribers", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal(
      "window",
      new BrowserWindow(storage as unknown as Storage),
    );
    const onA = vi.fn();
    const onB = vi.fn();
    const unsubscribeA = subscribeToWorldQuantHubPreferences(accountA, onA);
    const unsubscribeB = subscribeToWorldQuantHubPreferences(accountB, onB);

    expect(
      writeWorldQuantHubPreferencesSnapshot(
        accountA,
        '{"minutesPerDay":30}',
      ),
    ).toBe(true);

    expect(onA).toHaveBeenCalledOnce();
    expect(onB).not.toHaveBeenCalled();
    expect(readWorldQuantHubPreferencesSnapshot(accountA)).toBe(
      '{"minutesPerDay":30}',
    );
    expect(readWorldQuantHubPreferencesSnapshot(accountB)).toBe(
      EMPTY_WORLDQUANT_HUB_PREFERENCES_SNAPSHOT,
    );
    unsubscribeA();
    unsubscribeB();
  });
});
