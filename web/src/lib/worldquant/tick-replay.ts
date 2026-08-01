export const TICK_REPLAY_LAB_VERSION = 1 as const;

export const tickReplayActions = [
  "apply",
  "drop_duplicate",
  "mark_stale",
  "queue_live",
  "accept_snapshot",
  "reject_snapshot",
  "publish",
  "block_publish",
] as const;

export type TickReplayAction = (typeof tickReplayActions)[number];

type BookSide = "bid" | "ask";
type BookLevel = readonly [priceTicks: number, quantity: number];

export type TickReplayEvent =
  | {
      id: string;
      kind: "update";
      label: string;
      session: string;
      sequence: number;
      side: BookSide;
      priceTicks: number;
      quantity: number;
    }
  | {
      id: string;
      kind: "snapshot";
      label: string;
      session: string;
      sequence: number;
      bids: readonly BookLevel[];
      asks: readonly BookLevel[];
    }
  | {
      id: string;
      kind: "publish";
      label: string;
    };

export type TickReplayScenario = {
  id: string;
  version: typeof TICK_REPLAY_LAB_VERSION;
  title: string;
  summary: string;
  initial: {
    session: string;
    expectedSequence: number;
    bids: readonly BookLevel[];
    asks: readonly BookLevel[];
  };
  events: readonly TickReplayEvent[];
  canonicalActions: Readonly<Record<string, TickReplayAction>>;
};

export type TickReplayGrade = {
  passed: boolean;
  signature: string;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    message: string;
  }>;
};

type ReplayState = {
  mode: "live" | "recovering";
  session: string;
  expectedSequence: number;
  bids: Map<number, number>;
  asks: Map<number, number>;
  buffer: Extract<TickReplayEvent, { kind: "update" }>[];
  published: boolean;
};

type ReplayIssue =
  | "action"
  | "sequence"
  | "snapshot"
  | "book"
  | "publication"
  | "buffer";

const actionLabels: Record<TickReplayAction, string> = {
  apply: "Áp dụng cập nhật",
  drop_duplicate: "Bỏ bản trùng",
  mark_stale: "Đánh dấu trạng thái cũ và yêu cầu snapshot",
  queue_live: "Đưa cập nhật live vào hàng đợi",
  accept_snapshot: "Nhận snapshot và phát lại hàng đợi",
  reject_snapshot: "Từ chối snapshot sai phiên",
  publish: "Công bố trạng thái",
  block_publish: "Chặn công bố",
};

export function tickReplayActionLabel(action: TickReplayAction) {
  return actionLabels[action];
}

export function tickReplayActionsForEvent(
  event: TickReplayEvent,
): readonly TickReplayAction[] {
  if (event.kind === "snapshot") {
    return ["accept_snapshot", "reject_snapshot"];
  }
  if (event.kind === "publish") return ["publish", "block_publish"];
  return ["apply", "drop_duplicate", "mark_stale", "queue_live"];
}

export const tickReplayScenarios: readonly TickReplayScenario[] = [
  {
    id: "tick-replay-ordered-baseline",
    version: TICK_REPLAY_LAB_VERSION,
    title: "Luồng đúng thứ tự",
    summary:
      "Dựng sổ lệnh ban đầu và chỉ công bố khi chuỗi số thứ tự liên tục.",
    initial: {
      session: "feed-a",
      expectedSequence: 1,
      bids: [],
      asks: [],
    },
    events: [
      update("baseline-1", 1, "bid", 100, 10),
      update("baseline-2", 2, "ask", 101, 8),
      publish("baseline-publish"),
    ],
    canonicalActions: {
      "baseline-1": "apply",
      "baseline-2": "apply",
      "baseline-publish": "publish",
    },
  },
  {
    id: "tick-replay-gap-recovery",
    version: TICK_REPLAY_LAB_VERSION,
    title: "Bản trùng, khoảng thiếu và phát lại",
    summary:
      "Phát hiện khoảng thiếu, giữ các cập nhật live có giới hạn và khôi phục từ snapshot.",
    initial: {
      session: "feed-a",
      expectedSequence: 10,
      bids: [],
      asks: [],
    },
    events: [
      update("gap-10", 10, "bid", 100, 12),
      update("gap-duplicate-10", 10, "bid", 100, 99),
      update("gap-12", 12, "ask", 101, 5),
      update("gap-11", 11, "bid", 99, 3),
      publish("gap-block"),
      snapshot("gap-snapshot", "feed-a", 10, [[100, 12]], []),
      publish("gap-publish"),
    ],
    canonicalActions: {
      "gap-10": "apply",
      "gap-duplicate-10": "drop_duplicate",
      "gap-12": "mark_stale",
      "gap-11": "queue_live",
      "gap-block": "block_publish",
      "gap-snapshot": "accept_snapshot",
      "gap-publish": "publish",
    },
  },
  {
    id: "tick-replay-session-and-book-invariants",
    version: TICK_REPLAY_LAB_VERSION,
    title: "Sai phiên và sổ lệnh bị giao nhau",
    summary:
      "Không nhận snapshot của phiên khác và không công bố sổ lệnh có giá mua cao hơn giá bán.",
    initial: {
      session: "feed-a",
      expectedSequence: 20,
      bids: [[100, 10]],
      asks: [[102, 5]],
    },
    events: [
      update("invariant-delete", 20, "bid", 100, 0),
      update("invariant-bid", 21, "bid", 101, 4),
      update("invariant-cross", 22, "ask", 100, 3),
      snapshot("invariant-wrong-snapshot", "feed-b", 22, [[99, 7]], [
        [102, 5],
      ]),
      publish("invariant-block"),
      snapshot("invariant-good-snapshot", "feed-a", 22, [[99, 7]], [
        [102, 5],
      ]),
      publish("invariant-publish"),
    ],
    canonicalActions: {
      "invariant-delete": "apply",
      "invariant-bid": "apply",
      "invariant-cross": "mark_stale",
      "invariant-wrong-snapshot": "reject_snapshot",
      "invariant-block": "block_publish",
      "invariant-good-snapshot": "accept_snapshot",
      "invariant-publish": "publish",
    },
  },
];

export function gradeTickReplayScenario(
  scenarioId: string,
  selections: Readonly<Record<string, string>>,
): TickReplayGrade {
  const scenario = tickReplayScenarios.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error(`Unknown tick replay scenario ${scenarioId}`);
  const canonical = replayScenario(scenario, scenario.canonicalActions);
  const actual = replayScenario(scenario, selections);
  const correctActions = scenario.events.every(
    (event) => selections[event.id] === scenario.canonicalActions[event.id],
  );
  const checks = [
    check(
      "action-plan",
      "Chọn đúng hành động cho từng sự kiện",
      correctActions && !actual.issues.has("action"),
      "Mỗi quyết định phải phù hợp với trạng thái live hoặc đang khôi phục.",
    ),
    check(
      "sequence-continuity",
      "Giữ chuỗi số thứ tự liên tục",
      !actual.issues.has("sequence") && !actual.issues.has("buffer"),
      "Bản trùng không được làm đổi trạng thái; khoảng thiếu phải chặn luồng live.",
    ),
    check(
      "snapshot-identity",
      "Ràng buộc đúng phiên snapshot",
      !actual.issues.has("snapshot"),
      "Snapshot chỉ được nhận khi đúng phiên feed và đang khôi phục.",
    ),
    check(
      "book-invariants",
      "Giữ bất biến sổ lệnh",
      !actual.issues.has("book"),
      "Khối lượng 0 phải xóa mức giá và sổ lệnh giao nhau không được áp dụng.",
    ),
    check(
      "safe-publication",
      "Chỉ công bố trạng thái an toàn",
      !actual.issues.has("publication") && actual.state.published,
      "Không công bố khi còn thiếu sequence hoặc snapshot chưa được xác minh.",
    ),
    check(
      "canonical-result",
      "Tạo đúng trạng thái cuối xác định",
      actual.signature === canonical.signature,
      "Cùng dữ liệu đầu vào phải luôn tạo cùng trạng thái sổ lệnh cuối.",
    ),
  ];
  return {
    passed: checks.every((item) => item.passed),
    signature: actual.signature,
    checks,
  };
}

function replayScenario(
  scenario: TickReplayScenario,
  selections: Readonly<Record<string, string>>,
) {
  const state: ReplayState = {
    mode: "live",
    session: scenario.initial.session,
    expectedSequence: scenario.initial.expectedSequence,
    bids: new Map(scenario.initial.bids),
    asks: new Map(scenario.initial.asks),
    buffer: [],
    published: false,
  };
  const issues = new Set<ReplayIssue>();

  for (const event of scenario.events) {
    const selected = selections[event.id];
    if (!tickReplayActions.includes(selected as TickReplayAction)) {
      issues.add("action");
      continue;
    }
    applyDecision(state, event, selected as TickReplayAction, issues);
  }

  return {
    state,
    issues,
    signature: stateSignature(state),
  };
}

function applyDecision(
  state: ReplayState,
  event: TickReplayEvent,
  action: TickReplayAction,
  issues: Set<ReplayIssue>,
) {
  if (!tickReplayActionsForEvent(event).includes(action)) {
    issues.add("action");
    return;
  }
  if (event.kind === "publish") {
    const safe = state.mode === "live" && !isCrossed(state);
    if (action === "publish" && safe) {
      state.published = true;
    } else if (action === "block_publish" && !safe) {
      state.published = false;
    } else {
      issues.add("publication");
    }
    return;
  }
  if (event.kind === "snapshot") {
    if (action === "reject_snapshot") {
      if (event.session === state.session) issues.add("snapshot");
      return;
    }
    if (
      action !== "accept_snapshot" ||
      state.mode !== "recovering" ||
      event.session !== state.session
    ) {
      issues.add("snapshot");
      return;
    }
    state.bids = new Map(event.bids);
    state.asks = new Map(event.asks);
    state.expectedSequence = event.sequence + 1;
    if (isCrossed(state)) {
      issues.add("book");
      return;
    }
    replayBufferedUpdates(state, issues);
    return;
  }

  if (action === "apply") {
    if (
      state.mode !== "live" ||
      event.session !== state.session ||
      event.sequence !== state.expectedSequence ||
      wouldCross(state, event)
    ) {
      if (wouldCross(state, event)) issues.add("book");
      else issues.add("sequence");
      return;
    }
    applyLevel(state, event);
    state.expectedSequence += 1;
    return;
  }
  if (action === "drop_duplicate") {
    if (
      event.session !== state.session ||
      event.sequence >= state.expectedSequence
    ) {
      issues.add("sequence");
    }
    return;
  }
  if (action === "mark_stale") {
    const gap =
      event.session === state.session &&
      event.sequence > state.expectedSequence;
    const crossed =
      event.session === state.session &&
      event.sequence === state.expectedSequence &&
      wouldCross(state, event);
    if (state.mode !== "live" || (!gap && !crossed)) {
      issues.add(crossed ? "book" : "sequence");
      return;
    }
    state.mode = "recovering";
    state.published = false;
    if (gap) enqueue(state, event, issues);
    return;
  }
  if (action === "queue_live") {
    if (state.mode !== "recovering" || event.session !== state.session) {
      issues.add("sequence");
      return;
    }
    enqueue(state, event, issues);
  }
}

function replayBufferedUpdates(
  state: ReplayState,
  issues: Set<ReplayIssue>,
) {
  const queued = [...state.buffer].sort(
    (left, right) => left.sequence - right.sequence,
  );
  state.buffer = [];
  for (const update of queued) {
    if (update.sequence < state.expectedSequence) continue;
    if (update.sequence !== state.expectedSequence) {
      state.buffer.push(update);
      issues.add("buffer");
      continue;
    }
    if (wouldCross(state, update)) {
      issues.add("book");
      state.buffer.push(update);
      continue;
    }
    applyLevel(state, update);
    state.expectedSequence += 1;
  }
  state.mode = state.buffer.length ? "recovering" : "live";
}

function enqueue(
  state: ReplayState,
  event: Extract<TickReplayEvent, { kind: "update" }>,
  issues: Set<ReplayIssue>,
) {
  if (state.buffer.length >= 8) {
    issues.add("buffer");
    return;
  }
  state.buffer.push(event);
}

function applyLevel(
  state: ReplayState,
  event: Extract<TickReplayEvent, { kind: "update" }>,
) {
  const levels = event.side === "bid" ? state.bids : state.asks;
  if (event.quantity === 0) levels.delete(event.priceTicks);
  else levels.set(event.priceTicks, event.quantity);
}

function wouldCross(
  state: ReplayState,
  event: Extract<TickReplayEvent, { kind: "update" }>,
) {
  const copy: ReplayState = {
    ...state,
    bids: new Map(state.bids),
    asks: new Map(state.asks),
    buffer: [...state.buffer],
  };
  applyLevel(copy, event);
  return isCrossed(copy);
}

function isCrossed(state: ReplayState) {
  const bestBid = [...state.bids.keys()].sort((a, b) => b - a)[0];
  const bestAsk = [...state.asks.keys()].sort((a, b) => a - b)[0];
  return bestBid !== undefined && bestAsk !== undefined && bestBid >= bestAsk;
}

function stateSignature(state: ReplayState) {
  const bids = [...state.bids.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([price, quantity]) => `${price}=${quantity}`)
    .join(",");
  const asks = [...state.asks.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([price, quantity]) => `${price}=${quantity}`)
    .join(",");
  return [
    state.mode,
    state.session,
    state.expectedSequence,
    `B:${bids}`,
    `A:${asks}`,
    state.published ? "published" : "blocked",
  ].join("|");
}

function check(
  id: string,
  label: string,
  passed: boolean,
  message: string,
) {
  return { id, label, passed, message };
}

function update(
  id: string,
  sequence: number,
  side: BookSide,
  priceTicks: number,
  quantity: number,
): Extract<TickReplayEvent, { kind: "update" }> {
  return {
    id,
    kind: "update",
    label: `Update #${sequence} · ${side.toUpperCase()} ${priceTicks} × ${quantity}`,
    session: "feed-a",
    sequence,
    side,
    priceTicks,
    quantity,
  };
}

function snapshot(
  id: string,
  session: string,
  sequence: number,
  bids: readonly BookLevel[],
  asks: readonly BookLevel[],
): Extract<TickReplayEvent, { kind: "snapshot" }> {
  return {
    id,
    kind: "snapshot",
    label: `Snapshot ${session} tại sequence ${sequence}`,
    session,
    sequence,
    bids,
    asks,
  };
}

function publish(
  id: string,
): Extract<TickReplayEvent, { kind: "publish" }> {
  return {
    id,
    kind: "publish",
    label: "Yêu cầu công bố sổ lệnh cho hệ thống phía sau",
  };
}
