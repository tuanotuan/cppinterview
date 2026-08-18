import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mock-interview/profile", async () =>
  import("./profile"));
vi.mock("@/lib/code-runner/contracts", async () =>
  import("../code-runner/contracts"));

import {
  createMockInterviewSession,
  parseCompletedMockInterviewSessionHistory,
  parseMockInterviewSession,
  serializeMockInterviewSession,
  type MockInterviewSession,
} from "./session";
import { mockInterviewDimensionKeys } from "./contracts";

const baseSession = createMockInterviewSession({
  sessionId: "9f58ceae-6ce7-4d56-bf6e-2be2256cc063",
  setId: "worldquant-45-a",
  sourceRevision: "a".repeat(40),
  startedAt: new Date("2026-07-24T01:00:00.000Z"),
});

const session: MockInterviewSession = {
  ...baseSession,
  currentIndex: 1,
  answers: {
    "worldquant-tick-feed-correctness": {
      response: "A reference does not extend every lifetime automatically.",
      explanation: "Giữ ordering invariant trước khi tối ưu.",
    },
  },
  elapsedByQuestion: { "worldquant-tick-feed-correctness": 92 },
  activeQuestionStartedAt: "2026-07-24T01:03:00.000Z",
};

const notAssessedCompetency = {
  status: "not_assessed" as const,
  score: null,
  summary: "Chưa đủ bằng chứng.",
  strengths: [],
  gaps: [],
  evidenceQuestionIds: [],
};

const completedSession: MockInterviewSession = {
  ...baseSession,
  status: "completed",
  report: {
    overallScore: 72,
    readiness: "developing",
    summary: "Có nền tảng nhưng cần luyện thêm.",
    hiringSignal: "Bằng chứng hiện tại còn chưa đồng đều.",
    competencies: {
      modern_cpp: notAssessedCompetency,
      tick_data_order_book: notAssessedCompetency,
      data_pipeline_performance: notAssessedCompetency,
      engineering_quality: notAssessedCompetency,
      scripting: notAssessedCompetency,
      communication_ownership: notAssessedCompetency,
    },
    questionAssessments: baseSession.questions.map((question) => ({
      questionId: question.id,
      score: 72,
      verdict: "partial" as const,
      summary: "Câu trả lời mới đáp ứng một phần.",
      strengths: [],
      missedCriteria: [],
    })),
    interviewDimensions: mockInterviewDimensionKeys.map((key) => ({
      key,
      status: "assessed" as const,
      score: 72,
      summary: "Có bằng chứng từ câu trả lời trong buổi phỏng vấn.",
      evidenceIds: [
        `answer:${baseSession.questions[0]!.id}:response`,
      ],
      observations: [
        {
          feedback: "Nhận xét có bằng chứng cụ thể.",
          evidenceIds: [
            `answer:${baseSession.questions[0]!.id}:response`,
          ],
        },
      ],
    })),
    strengths: [],
    priorityGaps: [],
    studyPlan: [],
    nextPracticeActions: [1, 2, 3].map((priority) => ({
      priority,
      title: `Việc luyện ${priority}`,
      action: "Làm lại câu và kiểm chứng kết quả.",
      evidenceIds: [
        `answer:${baseSession.questions[priority - 1]!.id}:response`,
      ],
    })),
  },
};

describe("mock interview session persistence", () => {
  it("round-trips an in-progress versioned session", () => {
    expect(
      parseMockInterviewSession(serializeMockInterviewSession(session)),
    ).toEqual(session);
  });

  it("replays the same set with fresh timing and no previous answers", () => {
    const replay = createMockInterviewSession({
      sessionId: "f5f064e9-d6c9-4688-a3a8-82176c8a02b1",
      setId: session.setId,
      sourceRevision: session.sourceRevision,
      startedAt: new Date("2026-07-25T02:00:00.000Z"),
    });

    expect(replay.questions).toEqual(baseSession.questions);
    expect(replay.sessionId).not.toBe(session.sessionId);
    expect(replay.startedAt).not.toBe(session.startedAt);
    expect(Object.keys(replay.answers).sort()).toEqual([
      "worldquant-cmake-delivery",
      "worldquant-interval-stats-cpp",
    ]);
    expect(replay.answers).toEqual(baseSession.answers);
    expect(replay.elapsedByQuestion).toEqual({});
    expect(replay.sampleCodeRuns).toEqual({});
    expect(replay.hiddenCodeRuns).toEqual({});
    expect(replay.pendingCodeRuns).toEqual({});
    expect(replay.report).toBeUndefined();
  });

  it("round-trips sample evidence and pending idempotency state", () => {
    const withExecution: MockInterviewSession = {
      ...baseSession,
      sampleCodeRuns: {
        "worldquant-interval-stats-cpp": {
          suite: "sample",
          codeHash: "b".repeat(64),
          specRevision: 1,
          language: "cpp",
          status: "passed",
          passedTests: 2,
          totalTests: 2,
          durationMs: 431,
          diagnostics: "",
          output: "",
          cases: [
            { name: "empty interval", passed: true },
            { name: "OHLC and VWAP", passed: true },
          ],
          toolchain: "recall-sandbox-v1",
          completedAt: "2026-07-24T01:05:00.000Z",
        },
      },
      pendingCodeRuns: {
        "worldquant-cmake-delivery": {
          idempotencyKey: "866c9819-b77f-43ef-aa04-fbddeca40012",
          requestedAt: "2026-07-24T01:06:00.000Z",
        },
      },
    };

    expect(
      parseMockInterviewSession(
        serializeMockInterviewSession(withExecution),
      ),
    ).toEqual(withExecution);
  });

  it("rejects execution state for unknown questions or the wrong suite", () => {
    const evidence = {
      suite: "hidden" as const,
      codeHash: "b".repeat(64),
      specRevision: 1,
      language: "cpp" as const,
      status: "passed" as const,
      passedTests: 2,
      totalTests: 2,
      durationMs: 431,
      diagnostics: "",
      output: "",
      cases: [],
      toolchain: "recall-sandbox-v1",
      completedAt: "2026-07-24T01:05:00.000Z",
    };
    expect(
      parseMockInterviewSession(
        JSON.stringify({
          ...baseSession,
          sampleCodeRuns: {
            "worldquant-interval-stats-cpp": evidence,
          },
        }),
      ),
    ).toBeNull();
    expect(
      parseMockInterviewSession(
        JSON.stringify({
          ...baseSession,
          hiddenCodeRuns: {
            "invented-question": evidence,
          },
        }),
      ),
    ).toBeNull();
  });

  it("does not restore profile-v2 or schema-v2 sessions", () => {
    expect(
      parseMockInterviewSession(
        JSON.stringify({ ...baseSession, profileVersion: 2 }),
      ),
    ).toBeNull();
    expect(
      parseMockInterviewSession(
        JSON.stringify({ ...baseSession, schemaVersion: 2 }),
      ),
    ).toBeNull();
  });

  it("reads completed profile-v3 history without restoring an active v3 session", () => {
    expect(
      parseCompletedMockInterviewSessionHistory(
        JSON.stringify(completedSession),
      ),
    ).toEqual(completedSession);

    const legacyCompleted = {
      ...completedSession,
      profileVersion: 3,
      questions: completedSession.questions.map((question) => ({
        ...question,
        version: Math.max(1, question.version - 1),
        contentRevision: "worldquant-jd-2025-v1",
      })),
    };

    expect(
      parseMockInterviewSession(JSON.stringify(legacyCompleted)),
    ).toBeNull();
    expect(
      parseCompletedMockInterviewSessionHistory(
        JSON.stringify(legacyCompleted),
      ),
    ).toMatchObject({
      sessionId: completedSession.sessionId,
      profileVersion: 3,
      status: "completed",
      report: completedSession.report,
    });
    expect(
      parseCompletedMockInterviewSessionHistory(
        JSON.stringify({
          ...legacyCompleted,
          status: "in_progress",
          report: undefined,
        }),
      ),
    ).toBeNull();
  });

  it("rejects malformed and duplicate-question sessions", () => {
    expect(parseMockInterviewSession("not-json")).toBeNull();
    expect(
      parseMockInterviewSession(
        JSON.stringify({
          ...session,
          questions: [session.questions[0], session.questions[0]],
        }),
      ),
    ).toBeNull();
  });

  it("rejects a session whose duration, version or order does not match its set", () => {
    expect(
      parseMockInterviewSession(
        JSON.stringify({ ...session, durationMinutes: 30 }),
      ),
    ).toBeNull();
    expect(
      parseMockInterviewSession(
        JSON.stringify({ ...session, setVersion: 99 }),
      ),
    ).toBeNull();
    expect(
      parseMockInterviewSession(
        JSON.stringify({
          ...session,
          questions: [...session.questions].reverse(),
        }),
      ),
    ).toBeNull();
  });

  it("does not accept a completed session without its final report", () => {
    expect(
      parseMockInterviewSession(
        JSON.stringify({ ...session, status: "completed" }),
      ),
    ).toBeNull();
  });
});
