import { z } from "zod";

import { withBrowserStorageLock } from "../practice/browser-storage-lock";
import { focusPlanSchema } from "./focus-plan";
import {
  worldQuantDrillById,
} from "./drills";
import {
  worldQuantMissionId,
  type WorldQuantMission,
  type WorldQuantMissionItem,
} from "./mission";
import type { WorldQuantTrainingState } from "./training-state";
import {
  isValidReadinessDateKey,
  worldQuantCompetencies,
  worldQuantCompetencyKeys,
  worldQuantRoleProfileById,
  worldQuantRoleProfileIds,
  type ReadinessQuestionSummary,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "./readiness";

export const WORLDQUANT_MISSION_SNAPSHOT_VERSION = 2 as const;
export const WORLDQUANT_MISSION_SNAPSHOT_CHANGED_EVENT =
  "recall:worldquant-mission-snapshot-changed";
export const WORLDQUANT_MISSION_SNAPSHOT_RETENTION = 24;
const WORLDQUANT_MISSION_SNAPSHOT_STORAGE_PREFIX =
  "recall:worldquant-mission:";
const tabMissionSnapshotFallbacks = new Map<
  string,
  { sourceRaw: string | null; snapshotRaw: string }
>();

const roleProfileSchema = z.enum(worldQuantRoleProfileIds);
const competencySchema = z.enum(worldQuantCompetencyKeys);
const missionItemIdSchema = z.string().min(1).max(200);
const timeBudgetSchema = z.number().int().min(15).max(120);

const snapshotItemSchema = z.discriminatedUnion("kind", [
  z
    .object({
      id: missionItemIdSchema,
      kind: z.literal("repair"),
      competency: competencySchema,
      estimatedMinutes: z.literal(3),
      repairCardId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      id: missionItemIdSchema,
      kind: z.literal("flashcards"),
      competency: competencySchema,
      estimatedMinutes: z.number().int().positive().max(120),
      focusPlan: focusPlanSchema,
    })
    .strict(),
  z
    .object({
      id: missionItemIdSchema,
      kind: z.literal("drill"),
      competency: competencySchema,
      estimatedMinutes: z.number().int().positive().max(120),
      drillId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      drillVersion: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      id: missionItemIdSchema,
      kind: z.literal("mock"),
      competency: z.null(),
      estimatedMinutes: z.literal(30),
      roleProfileVersion: z.literal(1),
      durationMinutes: z.literal(30),
      mode: z.literal("balanced"),
      targetCompetency: z.null(),
    })
    .strict(),
  z
    .object({
      id: missionItemIdSchema,
      kind: z.literal("content_gap"),
      competency: competencySchema,
      estimatedMinutes: z.literal(0),
    })
    .strict(),
]);

export const worldQuantMissionSnapshotSchema = z
  .object({
    version: z.literal(WORLDQUANT_MISSION_SNAPSHOT_VERSION),
    missionVersion: z.literal(1),
    missionId: z.string().min(1).max(200),
    date: z.string().refine(isValidReadinessDateKey),
    roleProfileId: roleProfileSchema,
    roleProfileVersion: z.literal(1),
    timeBudgetMinutes: timeBudgetSchema,
    plannedMinutes: z.number().int().nonnegative().max(120),
    primaryCompetency: competencySchema,
    items: z.array(snapshotItemSchema).max(25),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const itemIds = snapshot.items.map((item) => item.id);
    if (new Set(itemIds).size !== itemIds.length) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Mission snapshot item IDs must be unique",
      });
    }
    const plannedMinutes = snapshot.items.reduce(
      (sum, item) => sum + item.estimatedMinutes,
      0,
    );
    if (snapshot.plannedMinutes !== plannedMinutes) {
      context.addIssue({
        code: "custom",
        path: ["plannedMinutes"],
        message: "Mission snapshot minutes must match its exact items",
      });
    }
    if (snapshot.plannedMinutes > snapshot.timeBudgetMinutes) {
      context.addIssue({
        code: "custom",
        path: ["plannedMinutes"],
        message: "Mission snapshot cannot exceed its time budget",
      });
    }
    for (const [index, item] of snapshot.items.entries()) {
      if (
        item.kind === "flashcards" &&
        (item.focusPlan.profileId !== snapshot.roleProfileId ||
          item.focusPlan.profileVersion !== snapshot.roleProfileVersion ||
          item.focusPlan.createdOn !== snapshot.date ||
          item.focusPlan.focusCompetency !== item.competency ||
          item.focusPlan.scheduledMinutes !== item.estimatedMinutes)
      ) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "focusPlan"],
          message: "Frozen Focus plan must match the mission scope",
        });
      }
    }
  });

export type WorldQuantMissionSnapshot = z.infer<
  typeof worldQuantMissionSnapshotSchema
>;
export type WorldQuantMissionSnapshotScope = {
  accountId: string | null;
  date: string;
  roleProfileId: WorldQuantRoleProfileId;
  timeBudgetMinutes: number;
};

export function createWorldQuantMissionSnapshot(
  mission: WorldQuantMission,
): WorldQuantMissionSnapshot {
  const profile = worldQuantRoleProfileById(mission.roleProfileId);
  return worldQuantMissionSnapshotSchema.parse({
    version: WORLDQUANT_MISSION_SNAPSHOT_VERSION,
    missionVersion: mission.version,
    missionId: mission.missionId,
    date: mission.date,
    roleProfileId: mission.roleProfileId,
    roleProfileVersion: profile.version,
    timeBudgetMinutes: mission.timeBudgetMinutes,
    plannedMinutes: mission.plannedMinutes,
    primaryCompetency: mission.primaryCompetency,
    items: mission.items.map(snapshotItem),
  });
}

export function parseWorldQuantMissionSnapshot(
  raw: string | null,
): WorldQuantMissionSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = worldQuantMissionSnapshotSchema.safeParse(
      JSON.parse(raw),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function serializeWorldQuantMissionSnapshot(
  snapshot: WorldQuantMissionSnapshot,
) {
  return JSON.stringify(worldQuantMissionSnapshotSchema.parse(snapshot));
}

export function rehydrateWorldQuantMissionSnapshot({
  snapshot,
  questions,
  trainingState,
  mockAvailable = true,
}: {
  snapshot: WorldQuantMissionSnapshot;
  questions: readonly ReadinessQuestionSummary[];
  trainingState: WorldQuantTrainingState;
  mockAvailable?: boolean;
}): WorldQuantMission | null {
  const parsed = worldQuantMissionSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) return null;
  const frozen = parsed.data;
  if (
    !mockAvailable &&
    frozen.items.some((item) => item.kind === "mock")
  ) {
    return null;
  }
  const profile = worldQuantRoleProfileById(frozen.roleProfileId);
  if (
    profile.version !== frozen.roleProfileVersion ||
    profile.weights[frozen.primaryCompetency] <= 0
  ) {
    return null;
  }
  const frozenContentGaps = frozen.items.filter(
    (item) => item.kind === "content_gap",
  );
  const hasCanonicalPrimaryContent = questions.some(
    (question) =>
      question.competency === frozen.primaryCompetency &&
      question.validation !== "personal_remediation" &&
      profile.weights[question.competency] > 0,
  );
  if (
    frozenContentGaps.some(
      (item) => item.competency !== frozen.primaryCompetency,
    ) ||
    (frozenContentGaps.length > 0) === hasCanonicalPrimaryContent
  ) {
    return null;
  }
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const items: WorldQuantMissionItem[] = [];

  for (const item of frozen.items) {
    if (item.kind === "repair") {
      const repairCard = trainingState.repairCards.find(
        (card) => card.id === item.repairCardId,
      );
      if (
        !repairCard ||
        repairCard.competency !== item.competency
      ) {
        return null;
      }
      items.push({
        id: item.id,
        kind: "repair",
        competency: item.competency,
        estimatedMinutes: item.estimatedMinutes,
        reason:
          "Một tiêu chí chấm từng bị thiếu và đã đến lúc cần nhớ lại.",
        repairCard,
      });
      continue;
    }

    if (item.kind === "flashcards") {
      const valid = item.focusPlan.questions.every((planned) => {
        const { question } = planned;
        const current = questionsById.get(question.id);
        return (
          current?.version === question.version &&
          current.sourceHash === question.sourceHash &&
          current.deckId === question.deckId &&
          current.estimatedMinutes === question.estimatedMinutes &&
          current.competency === planned.competency
        );
      });
      if (!valid) return null;
      items.push({
        id: item.id,
        kind: "flashcards",
        competency: item.competency,
        estimatedMinutes: item.estimatedMinutes,
        reason:
          "Ôn đúng các thẻ đã duyệt trước khi chuyển sang bài vận dụng.",
        focusPlan: item.focusPlan,
      });
      continue;
    }

    if (item.kind === "drill") {
      const drill = worldQuantDrillById(item.drillId);
      if (
        !drill ||
        drill.version !== item.drillVersion ||
        drill.competency !== item.competency ||
        drill.estimatedMinutes !== item.estimatedMinutes
      ) {
        return null;
      }
      items.push({
        id: item.id,
        kind: "drill",
        competency: item.competency,
        estimatedMinutes: item.estimatedMinutes,
        reason:
          drill.variant === "checkpoint"
            ? "Năng lực đã sẵn sàng để xác nhận; dùng đề bài chưa từng làm để kiểm tra."
            : "Chuyển việc nhớ kiến thức thành giải thích, gỡ lỗi hoặc viết mã có câu hỏi tiếp nối.",
        drill,
      });
      continue;
    }

    if (item.kind === "mock") {
      items.push({
        id: item.id,
        kind: "mock",
        competency: null,
        estimatedMinutes: 30,
        reason:
          "Bài kiểm tra định kỳ; kết quả phỏng vấn thử vẫn tách khỏi Chỉ số chuẩn bị.",
        href: `/mock-interview?role=${frozen.roleProfileId}&mode=balanced&duration=30`,
        roleProfileVersion: item.roleProfileVersion,
        durationMinutes: item.durationMinutes,
        mode: item.mode,
        targetCompetency: item.targetCompetency,
      });
      continue;
    }

    const definition = worldQuantCompetencies[item.competency];
    items.push({
      id: item.id,
      kind: "content_gap",
      competency: item.competency,
      estimatedMinutes: 0,
      reason: `Kho câu hỏi chưa có thẻ đã duyệt phù hợp cho ${definition.shortLabel}; đây là phần học liệu còn thiếu, không phải điểm yếu cá nhân.`,
      href: definition.practiceHref,
    });
  }

  const mission: WorldQuantMission = {
    version: frozen.missionVersion,
    missionId: frozen.missionId,
    date: frozen.date,
    roleProfileId: frozen.roleProfileId,
    timeBudgetMinutes: frozen.timeBudgetMinutes,
    plannedMinutes: frozen.plannedMinutes,
    primaryCompetency: frozen.primaryCompetency,
    items,
  };
  return worldQuantMissionId({
    date: mission.date,
    roleProfileId: mission.roleProfileId,
    timeBudgetMinutes: mission.timeBudgetMinutes,
    primaryCompetency: mission.primaryCompetency,
    items: mission.items,
  }) === mission.missionId
    ? mission
    : null;
}

export function restoreOrBuildWorldQuantMission({
  rawSnapshot,
  scope,
  questions,
  trainingState,
  mockAvailable = true,
  build,
}: {
  rawSnapshot: string | null;
  scope: Omit<WorldQuantMissionSnapshotScope, "accountId">;
  questions: readonly ReadinessQuestionSummary[];
  trainingState: WorldQuantTrainingState;
  mockAvailable?: boolean;
  build: () => WorldQuantMission;
}): {
  mission: WorldQuantMission;
  snapshot: WorldQuantMissionSnapshot;
  restored: boolean;
} {
  const snapshot = parseWorldQuantMissionSnapshot(rawSnapshot);
  if (
    snapshot &&
    snapshot.date === scope.date &&
    snapshot.roleProfileId === scope.roleProfileId &&
    snapshot.timeBudgetMinutes === scope.timeBudgetMinutes
  ) {
    const mission = rehydrateWorldQuantMissionSnapshot({
      snapshot,
      questions,
      trainingState,
      mockAvailable,
    });
    if (mission) return { mission, snapshot, restored: true };
  }
  const mission = build();
  return {
    mission,
    snapshot: createWorldQuantMissionSnapshot(mission),
    restored: false,
  };
}

export function worldQuantMissionSnapshotStorageKey(
  scope: WorldQuantMissionSnapshotScope,
) {
  const accountScope = scope.accountId
    ? z.string().uuid().parse(scope.accountId)
    : "local";
  const date = z.string().refine(isValidReadinessDateKey).parse(scope.date);
  const roleProfileId = roleProfileSchema.parse(scope.roleProfileId);
  const timeBudgetMinutes = timeBudgetSchema.parse(
    scope.timeBudgetMinutes,
  );
  return `${WORLDQUANT_MISSION_SNAPSHOT_STORAGE_PREFIX}${accountScope}:${date}:${roleProfileId}:${timeBudgetMinutes}:v2`;
}

export function readWorldQuantMissionSnapshot(
  scope: WorldQuantMissionSnapshotScope,
) {
  try {
    return window.localStorage.getItem(
      worldQuantMissionSnapshotStorageKey(scope),
    );
  } catch {
    return null;
  }
}

export function writeWorldQuantMissionSnapshot(
  scope: WorldQuantMissionSnapshotScope,
  snapshot: WorldQuantMissionSnapshot,
) {
  try {
    const serialized = serializeWorldQuantMissionSnapshot(snapshot);
    const key = worldQuantMissionSnapshotStorageKey(scope);
    window.localStorage.setItem(key, serialized);
    pruneWorldQuantMissionSnapshots(window.localStorage, key);
    window.dispatchEvent(
      new CustomEvent(WORLDQUANT_MISSION_SNAPSHOT_CHANGED_EVENT, {
        detail: { key },
      }),
    );
    if (scope.accountId) {
      void syncWorldQuantMissionSnapshotToCloud(scope);
    }
    return true;
  } catch {
    return false;
  }
}

const missionCloudSyncs = new Map<string, Promise<void>>();

/** Keeps the first saved mission for a signed-in scope stable on every device. */
export function syncWorldQuantMissionSnapshotToCloud(
  scope: WorldQuantMissionSnapshotScope,
): Promise<void> {
  if (!scope.accountId || typeof window === "undefined") return Promise.resolve();
  const key = worldQuantMissionSnapshotStorageKey(scope);
  const active = missionCloudSyncs.get(key);
  if (active) return active.then(() => syncWorldQuantMissionSnapshotToCloud(scope));
  const sync = syncMissionSnapshot(scope).finally(() => missionCloudSyncs.delete(key));
  missionCloudSyncs.set(key, sync);
  return sync;
}

async function syncMissionSnapshot(scope: WorldQuantMissionSnapshotScope) {
  const remote = await readMissionCloudSnapshot(scope);
  if (!remote) return;
  if (remote.snapshot) {
    writeMissionSnapshotLocally(scope, remote.snapshot);
    return;
  }
  const local = parseWorldQuantMissionSnapshot(readWorldQuantMissionSnapshot(scope));
  if (!local) return;
  const saved = await writeMissionCloudSnapshot(scope, local, remote.revision);
  if (!saved) return;
  writeMissionSnapshotLocally(scope, saved.snapshot);
}

async function readMissionCloudSnapshot(scope: WorldQuantMissionSnapshotScope): Promise<{
  snapshot: WorldQuantMissionSnapshot | null;
  revision: number;
} | null> {
  try {
    const query = new URLSearchParams({
      date: scope.date,
      role: scope.roleProfileId,
      minutes: String(scope.timeBudgetMinutes),
    });
    const response = await fetch(`/api/worldquant/mission-snapshot?${query}`, { cache: "no-store" });
    if (!response.ok) return null;
    const parsed = z.object({
      snapshot: worldQuantMissionSnapshotSchema.nullable(),
      revision: z.number().int().nonnegative(),
    }).safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function writeMissionCloudSnapshot(
  scope: WorldQuantMissionSnapshotScope,
  snapshot: WorldQuantMissionSnapshot,
  expectedRevision: number,
) {
  try {
    const response = await fetch("/api/worldquant/mission-snapshot", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: scope.date,
        roleProfileId: scope.roleProfileId,
        timeBudgetMinutes: scope.timeBudgetMinutes,
        snapshot,
        expectedRevision,
      }),
      cache: "no-store",
    });
    if (response.status !== 200 && response.status !== 409) return null;
    const parsed = z.object({
      snapshot: worldQuantMissionSnapshotSchema,
      revision: z.number().int().nonnegative(),
      conflict: z.boolean(),
    }).safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeMissionSnapshotLocally(
  scope: WorldQuantMissionSnapshotScope,
  snapshot: WorldQuantMissionSnapshot,
) {
  try {
    const key = worldQuantMissionSnapshotStorageKey(scope);
    window.localStorage.setItem(key, serializeWorldQuantMissionSnapshot(snapshot));
    window.dispatchEvent(
      new CustomEvent(WORLDQUANT_MISSION_SNAPSHOT_CHANGED_EVENT, { detail: { key } }),
    );
  } catch {
    // The remote snapshot is still available on the next signed-in visit.
  }
}

export function ensureWorldQuantMissionSnapshot(
  scope: WorldQuantMissionSnapshotScope,
  snapshot: WorldQuantMissionSnapshot,
  { replaceExisting = false }: { replaceExisting?: boolean } = {},
) {
  const key = worldQuantMissionSnapshotStorageKey(scope);
  return withBrowserStorageLock(key, () => {
    const existing = parseWorldQuantMissionSnapshot(
      readWorldQuantMissionSnapshot(scope),
    );
    if (existing && !replaceExisting) return true;
    return writeWorldQuantMissionSnapshot(scope, snapshot);
  });
}

export function subscribeToWorldQuantMissionSnapshot(
  scope: WorldQuantMissionSnapshotScope,
  callback: () => void,
) {
  const key = worldQuantMissionSnapshotStorageKey(scope);
  const onStorage = (event: StorageEvent) => {
    if (
      event.storageArea === window.localStorage &&
      event.key === key
    ) {
      callback();
    }
  };
  const onChanged = (event: Event) => {
    if (
      event instanceof CustomEvent &&
      event.detail?.key === key
    ) {
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(
    WORLDQUANT_MISSION_SNAPSHOT_CHANGED_EVENT,
    onChanged,
  );
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(
      WORLDQUANT_MISSION_SNAPSHOT_CHANGED_EVENT,
      onChanged,
    );
  };
}

export function readTabMissionSnapshotFallback(
  scope: WorldQuantMissionSnapshotScope,
  sourceRaw: string | null,
) {
  if (typeof window === "undefined") return null;
  const cached = tabMissionSnapshotFallbacks.get(
    worldQuantMissionSnapshotStorageKey(scope),
  );
  return cached?.sourceRaw === sourceRaw
    ? cached.snapshotRaw
    : null;
}

export function rememberTabMissionSnapshotFallback(
  scope: WorldQuantMissionSnapshotScope,
  sourceRaw: string | null,
  snapshot: WorldQuantMissionSnapshot,
) {
  if (typeof window === "undefined") return;
  const key = worldQuantMissionSnapshotStorageKey(scope);
  if (
    !tabMissionSnapshotFallbacks.has(key) &&
    tabMissionSnapshotFallbacks.size >= 24
  ) {
    const oldestKey = tabMissionSnapshotFallbacks.keys().next().value;
    if (oldestKey) tabMissionSnapshotFallbacks.delete(oldestKey);
  }
  tabMissionSnapshotFallbacks.set(key, {
    sourceRaw,
    snapshotRaw: serializeWorldQuantMissionSnapshot(snapshot),
  });
}

export function forgetTabMissionSnapshotFallback(
  scope: WorldQuantMissionSnapshotScope,
) {
  if (typeof window === "undefined") return;
  tabMissionSnapshotFallbacks.delete(
    worldQuantMissionSnapshotStorageKey(scope),
  );
}

export function worldQuantMissionSnapshotKeysToPrune(
  keys: readonly string[],
  currentKey: string,
  retention = WORLDQUANT_MISSION_SNAPSHOT_RETENTION,
) {
  const current = parseMissionSnapshotStorageKey(currentKey);
  if (!current) return [];
  const boundedRetention = Number.isFinite(retention)
    ? Math.max(1, Math.floor(retention))
    : WORLDQUANT_MISSION_SNAPSHOT_RETENTION;
  const sameAccountSnapshots = [
    ...new Set([...keys, currentKey]),
  ]
    .map((key) => ({
      key,
      parsed: parseMissionSnapshotStorageKey(key),
    }))
    .filter(
      (
        item,
      ): item is {
        key: string;
        parsed: MissionSnapshotStorageKeyParts;
      } =>
        item.parsed !== null &&
        item.parsed.accountScope === current.accountScope,
    )
    .sort(
      (left, right) =>
        right.parsed.date.localeCompare(left.parsed.date) ||
        right.key.localeCompare(left.key),
    );
  const retained = new Set<string>([currentKey]);
  for (const snapshot of sameAccountSnapshots) {
    if (retained.size >= boundedRetention) break;
    retained.add(snapshot.key);
  }
  return sameAccountSnapshots
    .map((snapshot) => snapshot.key)
    .filter((key) => !retained.has(key));
}

function pruneWorldQuantMissionSnapshots(
  storage: Storage,
  currentKey: string,
) {
  let keys: string[];
  try {
    keys = Array.from(
      { length: storage.length },
      (_, index) => storage.key(index),
    ).filter((key): key is string => key !== null);
  } catch {
    return;
  }
  for (const key of worldQuantMissionSnapshotKeysToPrune(
    keys,
    currentKey,
  )) {
    try {
      storage.removeItem(key);
    } catch {
      // The current snapshot is already durable; retention is best effort.
    }
  }
}

type MissionSnapshotStorageKeyParts = {
  accountScope: string;
  date: string;
};

function parseMissionSnapshotStorageKey(
  key: string,
): MissionSnapshotStorageKeyParts | null {
  if (!key.startsWith(WORLDQUANT_MISSION_SNAPSHOT_STORAGE_PREFIX)) {
    return null;
  }
  const parts = key
    .slice(WORLDQUANT_MISSION_SNAPSHOT_STORAGE_PREFIX.length)
    .split(":");
  if (parts.length !== 5) return null;
  const [accountScope, date, roleProfileId, timeBudget, version] =
    parts;
  if (
    (accountScope !== "local" &&
      !z.string().uuid().safeParse(accountScope).success) ||
    !z.string().refine(isValidReadinessDateKey).safeParse(date)
      .success ||
    !roleProfileSchema.safeParse(roleProfileId).success ||
    !timeBudgetSchema.safeParse(Number(timeBudget)).success ||
    version !== "v2"
  ) {
    return null;
  }
  return { accountScope, date };
}

function snapshotItem(item: WorldQuantMissionItem) {
  if (item.kind === "repair") {
    return {
      id: item.id,
      kind: item.kind,
      competency: item.competency,
      estimatedMinutes: item.estimatedMinutes,
      repairCardId: item.repairCard.id,
    };
  }
  if (item.kind === "flashcards") {
    return {
      id: item.id,
      kind: item.kind,
      competency: item.competency as WorldQuantCompetencyKey,
      estimatedMinutes: item.estimatedMinutes,
      focusPlan: item.focusPlan,
    };
  }
  if (item.kind === "drill") {
    return {
      id: item.id,
      kind: item.kind,
      competency: item.competency,
      estimatedMinutes: item.estimatedMinutes,
      drillId: item.drill.id,
      drillVersion: item.drill.version,
    };
  }
  if (item.kind === "mock") {
    return {
      id: item.id,
      kind: item.kind,
      competency: null,
      estimatedMinutes: item.estimatedMinutes,
      roleProfileVersion: item.roleProfileVersion,
      durationMinutes: item.durationMinutes,
      mode: item.mode,
      targetCompetency: item.targetCompetency,
    };
  }
  return {
    id: item.id,
    kind: item.kind,
    competency: item.competency,
    estimatedMinutes: item.estimatedMinutes,
  };
}
