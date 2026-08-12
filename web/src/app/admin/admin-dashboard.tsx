"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type {
  AdminDashboardSnapshot,
  AdminQuestion,
  AdminQuestionStatus,
} from "@/lib/admin/dashboard";
import { displayQuestionPrompt } from "@/lib/content/question-prompt";
import type {
  EditableQuestionContent,
  ManualQuestionRequest,
} from "@/lib/content/question-overrides";
import {
  questionDifficultyLabels,
  questionResponseModeLabels,
} from "@/lib/content/user-facing-labels";
import type {
  AiUsageSummary,
  ContentGenerationJobSummary,
  GeminiUsageSummary,
  PracticeAccount,
} from "@/lib/practice/cloud-server";
import type {
  MistakeFlashcardCandidate,
  MistakeGenerationMode,
} from "@/lib/practice/mistake-cards";
import {
  mutatePracticeProgressSnapshotLocked,
} from "@/lib/practice/storage";
import {
  ConfirmationDialog,
  useConfirmation,
} from "@/app/confirmation-dialog";
import { InputDialog } from "@/app/input-dialog";

import { ManualQuestionDialog } from "./manual-question-dialog";

const statusLabels: Record<AdminQuestionStatus, string> = {
  active: "Đang dùng",
  pending: "Chờ duyệt",
  stale: "Nguồn đã đổi",
  archived: "Đã lưu trữ",
};

const standardLabels = {
  cpp98: "C++98",
  cpp11: "C++11",
  cpp20: "C++20",
  python3: "Python 3",
  cmake: "CMake",
};
const learningLabels = {
  new: "Mới",
  learning: "Đang học",
  review: "Ôn tập",
  relearning: "Học lại",
} as const;

const generationStatusLabels: Record<
  ContentGenerationJobSummary["status"],
  string
> = {
  pending: "Đang chờ",
  running: "Đang chạy",
  deferred: "Tạm hoãn",
  completed: "Hoàn tất",
  failed: "Thất bại",
  dead_letter: "Cần xử lý thủ công",
};

const generationErrorLabels: Record<string, string> = {
  dispatch_failure: "Không xác nhận được dấu mốc trước khi gọi AI",
  generation_failed: "Không tạo được nội dung",
  generation_lease_expired_after_dispatch:
    "Phiên xử lý hết hạn sau khi đã gửi yêu cầu tới AI",
  generation_lease_expired_before_dispatch:
    "Phiên xử lý hết hạn trước khi gửi yêu cầu tới AI",
  invalid_provider_json: "Dữ liệu AI trả về sai định dạng",
  invalid_provider_output: "Nội dung AI trả về không hợp lệ",
  legacy_deferred_outcome_unconfirmed:
    "Kết quả từ giao thức cũ chưa thể xác nhận",
  legacy_pending_retry_outcome_unconfirmed:
    "Lần chạy lại từ giao thức cũ chưa thể xác nhận",
  obsolete_generator_version: "Tác vụ dùng phiên bản bộ sinh câu hỏi cũ",
  provider_rate_limit: "Nhà cung cấp AI đang giới hạn yêu cầu",
  stale_manifest: "Danh mục nội dung đã thay đổi",
  stale_source: "Nguồn học liệu đã thay đổi",
  storage_failure: "Không lưu được nội dung",
};

const mistakeStatusLabels: Record<
  MistakeFlashcardCandidate["status"],
  string
> = {
  detected: "Đã phát hiện",
  needs_grounding: "Cần bổ sung nguồn",
  generating: "Đang tạo thẻ",
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  reinforce_existing: "Dùng câu đã có",
  dismissed: "Đã bỏ qua",
  failed: "Tạo thẻ thất bại",
  dead_letter: "Cần xử lý thủ công",
};

const reviewRatingLabels: Record<string, string> = {
  again: "Chưa nhớ",
  hard: "Khó",
  good: "Ổn",
  easy: "Dễ",
};
type ScheduleAction = "suspend" | "unsuspend" | "reset" | "reschedule";
type MistakeInputRequest =
  | { kind: "reinforce_existing"; candidateId: string }
  | { kind: "ground"; candidateId: string };

export function AdminDashboard({
  account,
  aiUsage,
  geminiUsage,
  initialGeminiFallbackEnabled,
  initialGenerationJobs,
  currentGeneratorVersion,
  initialSnapshot,
  initialMistakeCandidates,
  initialMistakeGenerationMode,
  mistakeQueueAvailable,
}: {
  account: PracticeAccount;
  aiUsage: AiUsageSummary | null;
  geminiUsage: GeminiUsageSummary | null;
  initialGeminiFallbackEnabled: boolean;
  initialGenerationJobs: ContentGenerationJobSummary[];
  currentGeneratorVersion: string;
  initialSnapshot: AdminDashboardSnapshot;
  initialMistakeCandidates: MistakeFlashcardCandidate[];
  initialMistakeGenerationMode: MistakeGenerationMode;
  mistakeQueueAvailable: boolean;
}) {
  const [questions, setQuestions] = useState(initialSnapshot.questions);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("current");
  const [learningFilter, setLearningFilter] = useState("all");
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [geminiFallbackEnabled, setGeminiFallbackEnabled] = useState(
    initialGeminiFallbackEnabled,
  );
  const [geminiSettingSaving, setGeminiSettingSaving] = useState(false);
  const [generationJobs, setGenerationJobs] = useState(initialGenerationJobs);
  const [retryingJobId, setRetryingJobId] = useState<number | null>(null);
  const [mistakeCandidates, setMistakeCandidates] = useState(
    initialMistakeCandidates,
  );
  const [mistakeMode, setMistakeMode] = useState(
    initialMistakeGenerationMode,
  );
  const [mistakeSavingId, setMistakeSavingId] = useState<string | null>(null);
  const [mistakeBackfilling, setMistakeBackfilling] = useState(false);
  const [mistakeInputRequest, setMistakeInputRequest] =
    useState<MistakeInputRequest | null>(null);
  const [manualQuestionOpen, setManualQuestionOpen] = useState(false);
  const [manualQuestionSaving, setManualQuestionSaving] = useState(false);
  const [manualQuestionError, setManualQuestionError] = useState<string | null>(
    null,
  );
  const { requestConfirmation, confirmationDialog } = useConfirmation();
  const filteredQuestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return questions.filter((question) => {
      const matchesQuery =
        !normalized ||
        question.id.includes(normalized) ||
        question.prompt.toLowerCase().includes(normalized) ||
        question.lessonTitle.toLowerCase().includes(normalized) ||
        question.knowledgePath.toLowerCase().includes(normalized);
      const matchesLearning =
        learningFilter === "all" ||
        (learningFilter === "suspended"
          ? question.learning.suspended
          : learningFilter === "leech"
            ? question.learning.leech
            : learningFilter === "due"
              ? !question.learning.suspended &&
                question.learning.state !== "new" &&
                question.learning.dueOn !== null &&
                question.learning.dueOn <= initialSnapshot.today
              : question.learning.state === learningFilter &&
                !question.learning.suspended);
      return (
        matchesQuery &&
        (status === "all" ||
          (status === "current"
            ? question.adminStatus !== "archived"
            : question.adminStatus === status)) &&
        matchesLearning
      );
    });
  }, [initialSnapshot.today, learningFilter, query, questions, status]);

  const reviewQueue = questions.filter(
    (question) =>
      (question.adminStatus === "pending" || question.adminStatus === "stale"),
  );
  const activeCount = questions.filter(
    (question) => question.adminStatus === "active",
  ).length;
  const staleCount = questions.filter(
    (question) => question.adminStatus === "stale",
  ).length;
  const currentDueCount = questions.filter(
    (question) =>
      question.adminStatus === "active" &&
      !question.learning.suspended &&
      question.learning.state !== "new" &&
      question.learning.dueOn !== null &&
      question.learning.dueOn <= initialSnapshot.today,
  ).length;
  const practicedCount = questions.filter(
    (question) => question.reviewHistory.length > 0,
  ).length;
  const totalReviewCount = questions.reduce(
    (total, question) => total + question.reviewHistory.length,
    0,
  );
  const lessonCoverage = initialSnapshot.lessons.map((lesson) => ({
    ...lesson,
    currentQuestions: questions.filter(
      (question) =>
        question.lessonId === lesson.id &&
        question.adminStatus !== "archived",
    ).length,
    activeQuestions: questions.filter(
      (question) =>
        question.lessonId === lesson.id && question.adminStatus === "active",
    ).length,
  }));
  const uncovered = lessonCoverage.filter(
    (lesson) => lesson.currentQuestions === 0,
  );
  const visibleMistakes = mistakeCandidates.filter(
    (candidate) => candidate.status !== "dismissed",
  );
  const mistakeFunnel = {
    detected: visibleMistakes.length,
    generated: visibleMistakes.filter((item) =>
      ["pending_review", "approved"].includes(item.status),
    ).length,
    approved: visibleMistakes.filter((item) => item.status === "approved").length,
    firstReviewed: visibleMistakes.filter((item) => {
      const question = questions.find(
        (entry) => entry.id === item.materializedQuestionId,
      );
      return Boolean(question?.reviewHistory.length);
    }).length,
    resolved: visibleMistakes.filter((item) => {
      const question = questions.find(
        (entry) => entry.id === item.materializedQuestionId,
      );
      return (
        question?.learning.state === "review" &&
        question.learning.intervalDays >= 21
      );
    }).length,
    repeated: visibleMistakes.filter((item) => item.occurrenceCount > 1).length,
};

function mistakeErrorMessage(code: string) {
  return (
    {
      authentication_required: "Vui lòng đăng nhập lại.",
      invalid_request: "Dữ liệu gửi đi không hợp lệ.",
      question_store_unavailable: "Ngân hàng câu hỏi tạm thời chưa sẵn sàng.",
      migration_required: "Supabase chưa được cài đặt dữ liệu cần thiết.",
      ai_quota_exceeded: "Đã hết hạn mức AI. Vui lòng thử lại sau.",
      all_ai_quotas_exceeded:
        "Tất cả nguồn AI đều đã hết hạn mức. Vui lòng thử lại sau.",
      daily_budget_exceeded:
        "Đã hết hạn mức AI trong ngày. Vui lòng thử lại sau.",
      generation_outcome_unconfirmed:
        "Không thể xác nhận kết quả tạo thẻ. Hệ thống sẽ không tự gọi lại AI để tránh tính phí hai lần.",
      generation_failed: "AI chưa tạo được thẻ ghi nhớ.",
      history_unavailable: "Lịch sử phỏng vấn tạm thời chưa sẵn sàng.",
      monthly_budget_exceeded:
        "Đã hết hạn mức AI trong tháng. Vui lòng thử lại sau.",
      quota: "Đã hết hạn mức AI. Vui lòng thử lại sau.",
    }[code] ?? "Không hoàn tất được thao tác. Vui lòng thử lại."
  );
}

  async function saveMistakeMode(mode: MistakeGenerationMode) {
    const previous = mistakeMode;
    setMistakeMode(mode);
    const response = await fetch("/api/mistakes/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) {
      setMistakeMode(previous);
      setNotice("Không lưu được chế độ chuyển lỗi thành thẻ ghi nhớ.");
    }
  }

  async function generateMistake(candidateId: string) {
    setMistakeSavingId(candidateId);
    try {
      const response = await fetch("/api/mistakes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const payload = (await response.json()) as {
        status?: string;
        questionId?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "generation_failed");
      setNotice("Đã tạo thẻ sửa lỗi và đưa vào danh sách chờ duyệt.");
      window.location.reload();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Không tạo được thẻ: ${mistakeErrorMessage(error.message)}`
          : "Không tạo được thẻ sửa lỗi.",
      );
    } finally {
      setMistakeSavingId(null);
    }
  }

  async function resolveMistake(
    candidateId: string,
    action: "dismiss" | "reinforce_existing",
    matchedQuestionId: string | null = null,
  ) {
    if (action === "reinforce_existing" && !matchedQuestionId) {
      setMistakeInputRequest({ kind: "reinforce_existing", candidateId });
      return;
    }
    setMistakeSavingId(candidateId);
    const response = await fetch("/api/mistakes/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, action, matchedQuestionId }),
    });
    if (response.ok) {
      setMistakeCandidates((items) =>
        items.map((item) =>
          item.id === candidateId
            ? {
                ...item,
                status:
                  action === "dismiss" ? "dismissed" : "reinforce_existing",
                matchedQuestionId,
              }
            : item,
        ),
      );
    } else {
      setNotice("Không cập nhật được lỗi đang chờ xử lý.");
    }
    setMistakeSavingId(null);
  }

  async function backfillMistakes() {
    setMistakeBackfilling(true);
    const response = await fetch("/api/mistakes/backfill", { method: "POST" });
    const payload = (await response.json()) as {
      attemptsScanned?: number;
      observations?: number;
      error?: string;
    };
    setMistakeBackfilling(false);
    if (!response.ok) {
      setNotice(
        `Không khôi phục được lịch sử: ${
          payload.error
            ? mistakeErrorMessage(payload.error)
            : "lỗi không xác định"
        }`,
      );
      return;
    }
    setNotice(
      `Đã quét ${payload.attemptsScanned ?? 0} buổi phỏng vấn và khôi phục ${
        payload.observations ?? 0
      } lỗi mới.`,
    );
    window.location.reload();
  }

  async function groundMistake(
    candidateId: string,
    source?: { lessonId: string; sections: string },
  ) {
    if (!source) {
      setMistakeInputRequest({ kind: "ground", candidateId });
      return;
    }
    const lessonId = source.lessonId;
    const sections = source.sections;
    setMistakeSavingId(candidateId);
    const response = await fetch("/api/mistakes/ground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        lessonId: lessonId.trim(),
        sourceSectionIds: sections
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    setMistakeSavingId(null);
    if (!response.ok) {
      setNotice(
        "Nguồn không hợp lệ hoặc mục nội dung không thuộc bài học hiện tại.",
      );
      return;
    }
    setMistakeCandidates((items) =>
      items.map((item) =>
        item.id === candidateId
          ? { ...item, status: "detected", lessonId: lessonId.trim() }
          : item,
      ),
    );
    setNotice("Đã bổ sung nguồn. Lỗi này đã sẵn sàng để tạo thẻ ghi nhớ.");
  }

  async function approve(questionIds: string[]) {
    const selected = questions.filter(
      (question) =>
        questionIds.includes(question.id) &&
        (question.adminStatus === "pending" || question.adminStatus === "stale"),
    );
    if (!selected.length) return;

    setSavingIds(new Set(selected.map((question) => question.id)));
    setNotice(null);
    try {
      const response = await fetch("/api/questions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: selected.map((question) => ({
            questionId: question.id,
            questionVersion: question.version,
            sourceHash: question.sourceHash,
          })),
        }),
      });
      if (!response.ok) throw new Error("approval failed");
      const selectedIds = new Set(selected.map((question) => question.id));
      setQuestions((current) =>
        current.map((question) =>
          selectedIds.has(question.id)
            ? { ...question, approved: true, adminStatus: "active" }
            : question,
        ),
      );
      setNotice(`Đã duyệt ${selected.length} câu hỏi.`);
    } catch {
      setNotice("Chưa duyệt được. Tải lại trang và kiểm tra kết nối Supabase.");
    } finally {
      setSavingIds(new Set());
    }
  }

  async function toggleGeminiFallback() {
    const nextValue = !geminiFallbackEnabled;
    setGeminiSettingSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiFallbackEnabled: nextValue }),
      });
      const payload = (await response.json()) as {
        geminiFallbackEnabled?: boolean;
        error?: string;
      };
      if (!response.ok || payload.geminiFallbackEnabled === undefined) {
        throw new Error(payload.error || "Không lưu được cấu hình Gemini.");
      }
      setGeminiFallbackEnabled(payload.geminiFallbackEnabled);
      setNotice(
        payload.geminiFallbackEnabled
          ? "Đã bật Gemini miễn phí làm phương án dự phòng."
          : "Đã tắt Gemini miễn phí làm phương án dự phòng.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Không lưu được cấu hình Gemini dự phòng.",
      );
    } finally {
      setGeminiSettingSaving(false);
    }
  }

  async function retryGenerationJob(
    job: ContentGenerationJobSummary,
    confirmedAmbiguousOutcome = false,
  ) {
    setRetryingJobId(job.id);
    setNotice(null);
    try {
      const submitRetry = async (confirmAmbiguousOutcome: boolean) => {
        const response = await fetch("/api/admin/generation-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: job.id,
            confirmAmbiguousOutcome,
          }),
        });
        const payload = (await response.json()) as {
          status?: string;
          error?: string;
          requiresConfirmation?: boolean;
          confirmedAmbiguousOutcome?: boolean;
        };
        return { response, payload };
      };

      let result = await submitRetry(false);
      if (!result.response.ok && result.payload.requiresConfirmation) {
        if (!confirmedAmbiguousOutcome) {
          requestConfirmation({
            title: "Xác nhận chạy lại tác vụ AI",
        description: "Nhà cung cấp AI có thể đã xử lý yêu cầu trước đó. Chạy lại có thể tạo thêm một yêu cầu tính phí. Chỉ tiếp tục sau khi đã kiểm tra lịch sử sử dụng.",
            confirmLabel: "Tôi hiểu, chạy lại",
            tone: "danger",
            onConfirm: () => retryGenerationJob(job, true),
          });
          return;
        }
        result = await submitRetry(true);
      }

      const { response, payload } = result;
      if (
        !response.ok ||
        (payload.status !== "pending" &&
          payload.status !== "superseded")
      ) {
        throw new Error(payload.error || "Không thể chạy lại tác vụ tạo nội dung.");
      }
      setGenerationJobs((current) =>
        current.map((item) =>
          item.id === job.id
            ? payload.status === "superseded"
              ? {
                  ...item,
                  status: "completed",
                  lastError: {
                    code: "obsolete_generator_version_acknowledged",
                  },
                }
              : {
                  ...item,
                  status: "pending",
                  attemptCount: 0,
                  lastError: null,
                }
            : item,
        ),
      );
      setNotice(
        payload.status === "superseded"
          ? "Đã đóng tác vụ dùng bộ sinh cũ và giữ dấu vết xác nhận. Tác vụ phiên bản hiện tại có thể chạy ở lượt xử lý tiếp theo."
          : payload.confirmedAmbiguousOutcome
          ? "Đã ghi nhận xác nhận và đưa tác vụ về trạng thái chờ. Dấu vết của lần xử lý trước vẫn được giữ để kiểm tra."
          : "Đã đưa tác vụ về trạng thái chờ; hệ thống sẽ tự chạy lại ở lượt xử lý tiếp theo.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Không thể chạy lại tác vụ tạo nội dung.",
      );
    } finally {
      setRetryingJobId(null);
    }
  }

  async function manageSchedule(
    question: AdminQuestion,
    action: ScheduleAction,
    dueOn?: string,
  ) {
    setSavingIds(new Set([question.id]));
    setNotice(null);
    try {
      const response = await fetch("/api/admin/question-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, action, dueOn }),
      });
      const payload = (await response.json()) as {
        learning?: AdminQuestion["learning"];
        reviewHistory?: AdminQuestion["reviewHistory"];
        error?: string;
      };
      if (!response.ok || !payload.learning || !payload.reviewHistory) {
        throw new Error(payload.error || "Không cập nhật được lịch học.");
      }
      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? {
                ...item,
                learning: payload.learning!,
                reviewHistory: payload.reviewHistory!,
              }
            : item,
        ),
      );
      if (action === "reset") {
        try {
          await mutatePracticeProgressSnapshotLocked(
            account.id,
            (current) => ({
              ...current,
              reviews: current.reviews.filter(
                (review) => review.questionId !== question.id,
              ),
            }),
          );
        } catch {
          // The cloud reset cutoff prevents stale history from returning later.
        }
      }
      const actionLabel = {
        suspend: "tạm dừng",
        unsuspend: "tiếp tục",
        reset: "đặt lại thành câu mới",
        reschedule: `đổi hạn sang ${dueOn}`,
      }[action];
      setNotice(`Đã ${actionLabel} câu ${question.id}.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Không cập nhật được lịch học.",
      );
    } finally {
      setSavingIds(new Set());
    }
  }

  async function mutateQuestion(
    question: AdminQuestion,
    action: "edit" | "archive" | "restore",
    content?: EditableQuestionContent,
  ) {
    setSavingIds(new Set([question.id]));
    setNotice(null);
    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, questionId: question.id, content }),
      });
      const payload = (await response.json()) as {
        question?: Pick<
          AdminQuestion,
          | "id"
          | "type"
          | "responseMode"
          | "difficulty"
          | "estimatedMinutes"
          | "prompt"
          | "code"
          | "hint"
          | "answer"
          | "rubric"
          | "sources"
          | "sourceHash"
          | "status"
          | "version"
          | "taxonomy"
        >;
        approved?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.question || payload.approved === undefined) {
        throw new Error(payload.error || "Không lưu được thay đổi câu hỏi.");
      }
      const changedVersion = payload.question.version !== question.version;
      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? {
                ...item,
                ...payload.question!,
                approved: payload.approved!,
                adminStatus: clientAdminStatus(
                  payload.question!.status,
                  payload.approved!,
                ),
                learning: changedVersion
                  ? {
                      ...item.learning,
                      questionVersion: payload.question!.version,
                      sourceHash: payload.question!.sourceHash,
                      state: item.reviewHistory.length ? "learning" : "new",
                      dueOn: null,
                      intervalDays: 0,
                      contentChanged: item.reviewHistory.length > 0,
                    }
                  : item.learning,
                archivedByOwner:
                  action === "archive"
                    ? true
                    : action === "restore"
                      ? false
                      : item.archivedByOwner,
              }
            : item,
        ),
      );
      const actionLabel = {
        edit: "Đã lưu bản sửa; câu hỏi được đưa lại vào danh sách chờ duyệt.",
        archive:
          "Đã lưu trữ; lịch sử ôn và các lần dùng AI vẫn được giữ nguyên.",
        restore: "Đã khôi phục câu hỏi vào ngân hàng.",
      }[action];
      setNotice(`${actionLabel} (${question.id})`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không lưu được thay đổi câu hỏi.";
      setNotice(message);
      throw error;
    } finally {
      setSavingIds(new Set());
    }
  }

  async function createManualQuestion(input: ManualQuestionRequest) {
    setManualQuestionSaving(true);
    setManualQuestionError(null);
    try {
      const response = await fetch("/api/admin/questions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as {
        questionId?: string;
        version?: number;
        error?: string;
      };
      if (!response.ok || !payload.questionId || payload.version !== 1) {
        throw new Error(payload.error || "Không tạo được câu hỏi thủ công.");
      }
      setManualQuestionOpen(false);
      setNotice(
        `Đã tạo ${payload.questionId} và đưa vào danh sách chờ duyệt.`,
      );
      window.location.reload();
    } catch (error) {
      setManualQuestionError(
        error instanceof Error
          ? error.message
          : "Không tạo được câu hỏi thủ công.",
      );
    } finally {
      setManualQuestionSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#173f35]/15 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Về trang chủ Recall"
              title="Về trang chủ Recall"
              className="grid size-11 place-items-center rounded-2xl bg-[#173f35] font-mono text-sm font-bold text-[#d7ff91] focus-visible:ring-4 focus-visible:ring-[#d7ff91] focus-visible:outline-none"
            >
              R
            </Link>
            <div>
              <p className="text-lg font-bold">Quản trị Recall</p>
              <p className="text-xs text-[#64736c]">
                Quản lý nội dung và hoạt động học tập
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-xl bg-[#173f35] px-4 py-2 text-sm font-bold text-[#d7ff91] transition hover:bg-[#245748]"
              href="/practice"
            >
              Luyện hôm nay
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/60"
              href="/learn"
            >
              Thư viện
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/60"
              href="/admin/coverage"
            >
              Mức bao phủ
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-bold transition hover:bg-white/60"
              href="/worldquant"
            >
              Chuẩn bị phỏng vấn
            </Link>
            <span className="rounded-full border border-[#173f35]/15 bg-white/65 px-4 py-2 text-xs font-semibold">
              @{account.login ?? account.displayName}
            </span>
            <form action="/auth/logout" method="post">
              <button className="rounded-xl border border-[#173f35]/15 bg-white/70 px-4 py-2 text-sm font-bold hover:border-[#ba4b2f]/40">
                Đăng xuất
              </button>
            </form>
          </nav>
        </header>

        <section className="py-9">
          <p className="font-mono text-xs font-bold tracking-[0.18em] text-[#ba4b2f] uppercase">
            Tổng quan
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Quản lý Recall
              </h1>
              <p className="mt-3 text-[#64736c]">
                Phiên bản nguồn{" "}
                <span className="font-mono">
                  {initialSnapshot.sourceRevision.slice(0, 10)}
                </span>
              </p>
            </div>
          </div>
          {notice ? (
            <p className="mt-4 rounded-2xl border border-[#173f35]/15 bg-white/65 px-4 py-3 text-sm font-semibold">
              {notice}
            </p>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Nguồn tri thức" value={initialSnapshot.metrics.lessons} detail={`${uncovered.length} bài chưa có câu hiện tại`} tone="dark" />
          <MetricCard label="Ngân hàng câu hỏi" value={questions.filter((item) => item.status !== "archived").length} detail={`${activeCount} câu đang dùng`} />
          <MetricCard label="Danh sách chờ duyệt" value={reviewQueue.length} detail={`${staleCount} câu cần rà lại nguồn`} tone={reviewQueue.length ? "warning" : "default"} />
          <MetricCard label="Lượt ôn đã lưu" value={totalReviewCount} detail={`${practicedCount} câu đã từng luyện`} />
          <MetricCard
            label="AI trên trang web tháng này"
            value={`$${((aiUsage?.actualUsdMicros ?? 0) / 1_000_000).toFixed(3)}`}
            detail={`${aiUsage?.requestCount ?? 0} lượt trên web · chi phí OpenAI được cập nhật tức thời`}
            tone={(aiUsage?.actualUsdMicros ?? 0) >= 4_000_000 ? "warning" : "default"}
          />
          <MetricCard
            label="Gemini dự phòng hôm nay"
            value={geminiUsage?.requestCount ?? 0}
            detail={`${geminiUsage?.totalTokens ?? 0} token · ${geminiUsage?.lastModel ?? "chưa dùng"}`}
          />
        </section>

        <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#173f35]/15 bg-white/65 px-5 py-4">
          <div>
            <p className="text-sm font-bold">Gemini miễn phí dự phòng</p>
            <p className="mt-1 text-xs leading-5 text-[#64736c]">
              Chỉ dùng khi đã hết hạn mức OpenAI theo ngày hoặc tháng; không
              dùng cho các lỗi OpenAI thông thường.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={geminiFallbackEnabled}
            disabled={geminiSettingSaving}
            onClick={() => void toggleGeminiFallback()}
            className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${
              geminiFallbackEnabled
                ? "bg-[#173f35] text-white"
                : "border border-[#173f35]/20 bg-white text-[#52645c]"
            }`}
          >
            {geminiSettingSaving
              ? "Đang lưu…"
              : geminiFallbackEnabled
                ? "Đang bật"
                : "Đang tắt"}
          </button>
        </section>

        <details className="group mt-4 overflow-hidden rounded-2xl border border-[#173f35]/15 bg-white/65">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-bold">
                Quy trình tạo nội dung trực tiếp từ cơ sở dữ liệu
              </p>
              <p className="mt-1 text-xs text-[#64736c]">
                {generationJobs.filter((job) => ["pending", "running", "deferred"].includes(job.status)).length} tác vụ đang chờ hoặc đang chạy · {generationJobs.filter((job) => ["failed", "dead_letter"].includes(job.status)).length} tác vụ cần xử lý
              </p>
            </div>
            <span className="text-xs font-bold text-[#356b58]">
              <span className="group-open:hidden">Xem quy trình ↓</span>
              <span className="hidden group-open:inline">Thu gọn ↑</span>
            </span>
          </summary>
          <div className="border-t border-[#173f35]/10 px-5 py-4">
            <div className="space-y-2">
              {generationJobs.slice(0, 20).map((job) => {
                const obsoleteGenerator =
                  job.generatorVersion !== currentGeneratorVersion;
                const retryable =
                  ["deferred", "failed", "dead_letter"].includes(job.status) ||
                  (job.status === "pending" && obsoleteGenerator);
                const errorCode = typeof job.lastError?.code === "string"
                  ? job.lastError.code
                  : null;
                return (
                  <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#173f35]/10 bg-white/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold">#{job.id} · {job.lessonId}</p>
                      <p className="mt-1 text-xs text-[#64736c]">
                        {generationStatusLabels[job.status]} · lần{" "}
                        {job.attemptCount}/5 · {job.provider}/{job.model}
                        {obsoleteGenerator ? " · phiên bản bộ sinh cũ" : ""}
                        {errorCode
                          ? ` · ${generationErrorLabels[errorCode] ?? "Lỗi chưa được nhận diện"}`
                          : ""}
                      </p>
                    </div>
                    {retryable ? (
                      <button
                        type="button"
                        disabled={retryingJobId !== null}
                        onClick={() => void retryGenerationJob(job)}
                        className="rounded-xl border border-[#ba4b2f]/25 bg-white px-3 py-2 text-xs font-bold text-[#8e3825] disabled:opacity-50"
                      >
                        {retryingJobId === job.id
                          ? "Đang xử lý…"
                          : obsoleteGenerator
                            ? "Đóng phiên bản cũ"
                            : "Chạy lại"}
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {!generationJobs.length ? (
                <p className="rounded-xl border border-dashed border-[#173f35]/15 px-4 py-6 text-center text-sm text-[#64736c]">
                  Chưa có tác vụ tạo nội dung; bài học mới hoặc nguồn thay đổi
                  sẽ tự tạo tác vụ.
                </p>
              ) : null}
            </div>
          </div>
        </details>

        <details
          id="mistake-inbox"
          className="group mt-8 scroll-mt-5 overflow-hidden rounded-[2rem] border border-[#356b58]/20 bg-[#eef6e7]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:px-7 sm:py-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#d7ff91] font-mono text-sm font-bold text-[#173f35]">
                {mistakeFunnel.detected}
              </span>
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
                  Lỗi sai → thẻ ghi nhớ
                </p>
                <h2 className="mt-1 text-xl font-semibold">Hộp lỗi cần ôn</h2>
                <p className="mt-1 text-xs text-[#64736c]">
                  {mistakeFunnel.generated} đã tạo · {mistakeFunnel.approved} đã duyệt · {mistakeFunnel.firstReviewed} đã ôn · {mistakeFunnel.resolved} đạt 21 ngày · {mistakeFunnel.repeated} lỗi lặp lại
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#356b58]">
              <span className="group-open:hidden">Xem hộp lỗi ↓</span>
              <span className="hidden group-open:inline">Thu gọn ↑</span>
            </span>
          </summary>
          <div className="border-t border-[#356b58]/15 px-5 py-6 sm:px-7">
            {!mistakeQueueAvailable ? (
              <p className="rounded-xl border border-[#ba4b2f]/20 bg-[#fff4df] p-4 text-sm text-[#8e3825]">
                Chưa cài đặt dữ liệu chuyển lỗi thành thẻ ghi nhớ trong
                Supabase.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-2xl text-sm text-[#64736c]">
                    Chỉ những lỗi đã được lưu từ trợ lý AI hoặc buổi phỏng vấn
                    thử mới xuất hiện ở đây. AI tạo bản nháp có nguồn; quản trị
                    viên vẫn cần duyệt câu trước khi đưa vào lịch ôn.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={mistakeBackfilling}
                      onClick={() => void backfillMistakes()}
                      className="rounded-xl border border-[#173f35]/15 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
                    >
                      {mistakeBackfilling
                        ? "Đang quét…"
                        : "Khôi phục từ lịch sử phỏng vấn"}
                    </button>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      Khi phát hiện lỗi
                      <select
                        value={mistakeMode}
                        onChange={(event) =>
                          void saveMistakeMode(
                            event.target.value as MistakeGenerationMode,
                          )
                        }
                        className="rounded-xl border border-[#173f35]/15 bg-white px-3 py-2"
                      >
                        <option value="ask">Hỏi trước khi tạo</option>
                        <option value="auto">Tự tạo vào danh sách chờ</option>
                        <option value="off">Không lưu lỗi</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {visibleMistakes.map((candidate) => (
                    <article
                      key={candidate.id}
                      className="rounded-2xl border border-[#173f35]/12 bg-white/70 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-[#e7eee3] px-3 py-1 font-mono text-[10px] font-bold uppercase">
                          {mistakeStatusLabels[candidate.status]}
                        </span>
                        <span className="font-mono text-[10px] text-[#64736c]">
                          {candidate.sourceKind === "coach"
                            ? "Trợ lý AI"
                            : "Phỏng vấn thử"}{" "}
                          · {candidate.occurrenceCount} lần
                        </span>
                      </div>
                      <h3 className="mt-4 font-semibold leading-6">
                        {candidate.criterionText}
                      </h3>
                      <p className="mt-2 break-all font-mono text-[10px] text-[#64736c]">
                        {candidate.sourceQuestionId} ·{" "}
                        {candidate.lessonId ?? "chưa có bài học nguồn"}
                      </p>
                      {candidate.lastErrorCode ? (
                        <p className="mt-2 text-xs text-[#a3321f]">
                          Lỗi gần nhất:{" "}
                          {mistakeErrorMessage(candidate.lastErrorCode)}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["detected", "failed"].includes(candidate.status) ? (
                          <button
                            type="button"
                            disabled={mistakeSavingId !== null}
                            onClick={() => void generateMistake(candidate.id)}
                            className="rounded-xl bg-[#173f35] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {mistakeSavingId === candidate.id
                              ? "Đang tạo…"
                              : "Tạo thẻ ghi nhớ"}
                          </button>
                        ) : null}
                        {candidate.status === "needs_grounding" ? (
                          <button
                            type="button"
                            disabled={mistakeSavingId !== null}
                            onClick={() => void groundMistake(candidate.id)}
                            className="rounded-xl bg-[#fff4df] px-3 py-2 text-xs font-bold text-[#8e3825]"
                          >
                            Bổ sung bài học nguồn
                          </button>
                        ) : null}
                        {candidate.materializedQuestionId ? (
                          <a
                            href="#review-queue"
                            className="rounded-xl border border-[#356b58]/25 px-3 py-2 text-xs font-bold text-[#356b58]"
                          >
                            {candidate.materializedQuestionId}
                          </a>
                        ) : null}
                        {["detected", "failed", "needs_grounding"].includes(
                          candidate.status,
                        ) ? (
                          <>
                            <button
                              type="button"
                              disabled={mistakeSavingId !== null}
                              onClick={() =>
                                void resolveMistake(
                                  candidate.id,
                                  "reinforce_existing",
                                )
                              }
                              className="rounded-xl border border-[#173f35]/15 px-3 py-2 text-xs font-bold"
                            >
                              Dùng câu đã có
                            </button>
                            <button
                              type="button"
                              disabled={mistakeSavingId !== null}
                              onClick={() =>
                                void resolveMistake(candidate.id, "dismiss")
                              }
                              className="rounded-xl px-3 py-2 text-xs font-bold text-[#8e3825]"
                            >
                              Bỏ qua
                            </button>
                          </>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {!visibleMistakes.length ? (
                    <p className="rounded-2xl border border-dashed border-[#356b58]/25 p-8 text-center text-sm text-[#64736c] lg:col-span-2">
                      Chưa có lỗi đủ điều kiện. Khi bạn chọn “Chưa nhớ” hoặc
                      “Khó” sau phản hồi của AI, hay hoàn tất một buổi phỏng
                      vấn thử, hệ thống sẽ ghi nhận lỗi cần ôn.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </details>

        <details id="review-queue" className="group mt-8 scroll-mt-5 overflow-hidden rounded-[2rem] border border-[#ba4b2f]/20 bg-[#fff7e8]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:px-7 sm:py-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ffe0a8] font-mono text-sm font-bold text-[#8e3825]">
                {reviewQueue.length}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                  Danh sách chờ duyệt
                </p>
                <h2 className="mt-1 truncate text-xl font-semibold">
                  Danh sách chờ duyệt
                </h2>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-[#356b58]">
              <span className="group-open:hidden">Xem danh sách ↓</span>
              <span className="hidden group-open:inline">Thu gọn ↑</span>
            </span>
          </summary>

          <div className="border-t border-[#ba4b2f]/15 px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm text-[#64736c]">
                  Mở từng câu để đối chiếu đáp án, tiêu chí chấm và nguồn trước
                  khi đưa vào lịch luyện.
                </p>
                <Link
                  href="/learn/tick-data-order-book"
                  className="mt-2 inline-flex text-xs font-bold text-[#356b58] underline decoration-[#79b82a]/60 underline-offset-4"
                >
                  Chưa có nền tảng về dữ liệu tick? Đọc bài nhập môn trước →
                </Link>
              </div>
              {reviewQueue.length ? (
                <button
                  type="button"
                  onClick={() => void approve(reviewQueue.map((question) => question.id))}
                  disabled={savingIds.size > 0}
                  className="rounded-xl border border-[#ba4b2f]/35 bg-white/70 px-4 py-2.5 text-xs font-bold text-[#8e3825] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                >
                  {savingIds.size ? "Đang duyệt…" : `Duyệt tất cả (${reviewQueue.length})`}
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {reviewQueue.map((question) => (
                <QueueReviewCard
                  key={question.id}
                  question={question}
                  saving={savingIds.has(question.id)}
                  onApprove={() => void approve([question.id])}
                />
              ))}
              {!reviewQueue.length ? (
                <div className="rounded-2xl border border-dashed border-[#356b58]/25 bg-white/45 px-5 py-10 text-center text-sm text-[#52645c] lg:col-span-2">
                  Danh sách đã trống — không có câu nào cần duyệt.
                </div>
              ) : null}
            </div>
          </div>
        </details>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[2rem] border border-[#173f35]/15 bg-white/65 p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#356b58] uppercase">
                  Ngân hàng câu hỏi
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Ngân hàng câu hỏi</h2>
              </div>
              <span className="font-mono text-xs text-[#64736c]">
                {filteredQuestions.length}/{questions.length} câu
              </span>
              <button
                type="button"
                onClick={() => {
                  setManualQuestionError(null);
                  setManualQuestionOpen(true);
                }}
                className="rounded-xl bg-[#173f35] px-4 py-2.5 text-xs font-bold text-[#d7ff91] transition hover:bg-[#245748]"
              >
                + Thêm câu hỏi thủ công
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm câu hỏi, bài học…"
                className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2.5 text-sm outline-none focus:ring-3 focus:ring-[#d7ff91]"
              />
              <Filter value={status} onChange={setStatus} label="Trạng thái" options={[['current', 'Chưa lưu trữ'], ['all', 'Mọi trạng thái'], ['active', 'Đang dùng'], ['pending', 'Chờ duyệt'], ['stale', 'Nguồn đã đổi'], ['archived', 'Đã lưu trữ']]} />
              <Filter value={learningFilter} onChange={setLearningFilter} label="Trạng thái học" options={[['all', 'Mọi trạng thái học'], ['new', 'Mới'], ['learning', 'Đang học'], ['review', 'Ôn tập'], ['relearning', 'Học lại'], ['due', 'Đến hạn'], ['suspended', 'Tạm dừng'], ['leech', 'Câu khó nhớ']]} />
            </div>

            <div className="mt-6 space-y-3">
              {filteredQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  saving={savingIds.has(question.id)}
                  today={initialSnapshot.today}
                  onApprove={() => void approve([question.id])}
                  onManage={(action, dueOn) =>
                    void manageSchedule(question, action, dueOn)
                  }
                  onMutate={(action, content) =>
                    mutateQuestion(question, action, content)
                  }
                />
              ))}
              {!filteredQuestions.length ? (
                <div className="rounded-2xl border border-dashed border-[#173f35]/20 px-5 py-10 text-center text-sm text-[#64736c]">
                  Không có câu hỏi khớp bộ lọc.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-5">
            <CoveragePanel lessons={lessonCoverage} />
            <div className="rounded-[2rem] bg-[#173f35] p-6 text-white">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#d7ff91] uppercase">
                Tình trạng học tập
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <SmallStat label="Đến hạn" value={currentDueCount} />
                <SmallStat label="Đã luyện" value={practicedCount} />
                <SmallStat label="Chưa nhớ" value={initialSnapshot.ratingCounts.again} />
                <SmallStat label="Khó" value={initialSnapshot.ratingCounts.hard} />
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#173f35]/15 bg-white/65 p-6">
              <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#ba4b2f] uppercase">
                Vận hành
              </p>
              <div className="mt-4 grid gap-2 text-sm font-bold">
                <a className="rounded-xl bg-white px-4 py-3 hover:bg-[#edf0e8]" href="https://github.com/tuanotuan/modern-cpp-features/actions" target="_blank" rel="noreferrer">GitHub Actions ↗</a>
                <a className="rounded-xl bg-white px-4 py-3 hover:bg-[#edf0e8]" href="https://github.com/tuanotuan/modern-cpp-features" target="_blank" rel="noreferrer">Kho mã nguồn ↗</a>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#64736c]">
                Bản sửa và trạng thái lưu trữ được ghi đè trong Supabase. Ghi
                chú và câu gốc trên GitHub vẫn được giữ để đối chiếu.
              </p>
            </div>
          </aside>
        </section>
        {confirmationDialog}
        {manualQuestionOpen ? (
          <ManualQuestionDialog
            saving={manualQuestionSaving}
            error={manualQuestionError}
            onClose={() => setManualQuestionOpen(false)}
            onCreate={createManualQuestion}
          />
        ) : null}
        {mistakeInputRequest?.kind === "reinforce_existing" ? (
          <InputDialog
            title="Dùng câu hỏi đã có"
            description="Nhập ID chính xác của thẻ muốn tăng cường. Lỗi này sẽ được gắn vào thẻ đó thay vì tạo thẻ mới."
            fields={[{ name: "questionId", label: "ID câu hỏi", placeholder: "cpp20-example-001" }]}
            submitLabel="Gắn vào câu hỏi"
            busy={mistakeSavingId !== null}
            onCancel={() => setMistakeInputRequest(null)}
            onSubmit={(values) => {
              setMistakeInputRequest(null);
              void resolveMistake(
                mistakeInputRequest.candidateId,
                "reinforce_existing",
                values.questionId.trim(),
              );
            }}
          />
        ) : null}
        {mistakeInputRequest?.kind === "ground" ? (
          <InputDialog
            title="Bổ sung nguồn cho lỗi"
            description="Chỉ dùng các mục thực sự có trong bài học để thẻ mới bám sát kiến thức bạn đã lưu."
            fields={[
              { name: "lessonId", label: "ID bài học", placeholder: "cpp20-designated-initializers" },
              {
                name: "sections",
                label: "ID các mục nội dung",
                description: "Phân cách nhiều ID bằng dấu phẩy.",
                placeholder: "overview, constraints, example",
                multiline: true,
              },
            ]}
            submitLabel="Lưu nguồn"
            busy={mistakeSavingId !== null}
            onCancel={() => setMistakeInputRequest(null)}
            onSubmit={(values) => {
              setMistakeInputRequest(null);
              void groundMistake(mistakeInputRequest.candidateId, {
                lessonId: values.lessonId,
                sections: values.sections,
              });
            }}
          />
        ) : null}
      </div>
    </main>
  );
}

function QueueReviewCard({ question, saving, onApprove }: { question: AdminQuestion; saving: boolean; onApprove: () => void }) {
  return (
    <article className="rounded-2xl border border-[#173f35]/12 bg-white/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={question.adminStatus} />
          <QuestionClassificationBadges question={question} />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onApprove}
          className="rounded-xl bg-[#ba4b2f] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#963a25] disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Đang duyệt…" : "Duyệt câu này"}
        </button>
      </div>
      <h3 className="mt-4 font-semibold leading-6">
        {displayQuestionPrompt(question)}
      </h3>
      <p className="mt-2 font-mono text-[11px] text-[#718078]">
        {question.id} · {question.lessonTitle}
      </p>
      <details className="group mt-4 border-t border-[#173f35]/10 pt-4">
        <summary className="cursor-pointer list-none text-xs font-bold text-[#356b58]">
          <span className="group-open:hidden">
            Xem đáp án, tiêu chí chấm và nguồn ↓
          </span>
          <span className="hidden group-open:inline">Thu gọn ↑</span>
        </summary>
        <div className="mt-4">
          <QuestionDetails question={question} />
        </div>
      </details>
    </article>
  );
}

function QuestionCard({
  question,
  saving,
  today,
  onApprove,
  onManage,
  onMutate,
}: {
  question: AdminQuestion;
  saving: boolean;
  today: string;
  onApprove: () => void;
  onManage: (action: ScheduleAction, dueOn?: string) => void;
  onMutate: (
    action: "edit" | "archive" | "restore",
    content?: EditableQuestionContent,
  ) => Promise<void>;
}) {
  const reviewable = question.adminStatus === "pending" || question.adminStatus === "stale";
  const [dueOn, setDueOn] = useState(
    question.learning.dueOn ?? today,
  );
  const [editing, setEditing] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    "reset" | "archive" | null
  >(null);
  return (
    <details className="group rounded-2xl border border-[#173f35]/12 bg-white/75 open:border-[#356b58]/35">
      <summary className="flex list-none cursor-pointer items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={question.adminStatus} />
            <LearningBadge question={question} />
            <QuestionClassificationBadges question={question} />
          </div>
          <h3 className="mt-3 font-semibold leading-6">
            {displayQuestionPrompt(question)}
          </h3>
          <p className="mt-2 truncate font-mono text-[11px] text-[#718078]">{question.id} · {question.lessonTitle}</p>
        </div>
        <span className="mt-1 text-xl text-[#64736c] transition group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-[#173f35]/10 px-4 py-5 sm:px-5">
        <QuestionDetails question={question} />
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#173f35]/10 pt-4">
          {reviewable ? <button type="button" disabled={saving} onClick={onApprove} className="rounded-xl bg-[#ba4b2f] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? "Đang duyệt…" : "Duyệt câu này"}</button> : null}
          {question.adminStatus === "active" ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  onManage(question.learning.suspended ? "unsuspend" : "suspend")
                }
                className="rounded-xl border border-[#173f35]/20 bg-white px-3 py-2 text-xs font-bold text-[#356b58] disabled:opacity-50"
              >
                {question.learning.suspended ? "Tiếp tục" : "Tạm dừng"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPendingConfirmation("reset")}
                className="rounded-xl border border-[#ba4b2f]/25 bg-white px-3 py-2 text-xs font-bold text-[#8e3825] disabled:opacity-50"
              >
                Đặt lại thành câu mới
              </button>
              {question.learning.state !== "new" ? (
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <input
                    type="date"
                    value={dueOn}
                    onChange={(event) => setDueOn(event.target.value)}
                    className="rounded-xl border border-[#173f35]/15 bg-white px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    disabled={saving || !dueOn}
                    onClick={() => onManage("reschedule", dueOn)}
                    className="rounded-xl bg-[#173f35] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Đổi hạn
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
          {question.adminStatus !== "archived" ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing((current) => !current)}
                className="rounded-xl border border-[#173f35]/20 bg-white px-3 py-2 text-xs font-bold text-[#356b58] disabled:opacity-50"
              >
                {editing ? "Đóng biểu mẫu chỉnh sửa" : "Chỉnh sửa"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPendingConfirmation("archive")}
                className="rounded-xl border border-[#ba4b2f]/30 bg-white px-3 py-2 text-xs font-bold text-[#8e3825] disabled:opacity-50"
              >
                Lưu trữ
              </button>
            </>
          ) : question.archivedByOwner ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void onMutate("restore")}
              className="rounded-xl bg-[#173f35] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Khôi phục câu hỏi
            </button>
          ) : (
            <span className="rounded-xl bg-[#edf0e8] px-3 py-2 text-xs font-bold text-[#64736c]">
              Đã lưu trữ từ kho mã nguồn
            </span>
          )}
        </div>
        {editing && question.adminStatus !== "archived" ? (
          <QuestionEditor
            question={question}
            saving={saving}
            onCancel={() => setEditing(false)}
            onSave={async (content) => {
              await onMutate("edit", content);
              setEditing(false);
            }}
          />
        ) : null}
        {pendingConfirmation === "reset" ? (
          <ConfirmationDialog
            title="Đặt lại thẻ về trạng thái mới?"
            description="Toàn bộ lịch sử ôn riêng của thẻ này sẽ bị xóa. Thẻ sẽ quay về trạng thái Mới."
            confirmLabel="Đặt lại thẻ"
            busy={saving}
            onCancel={() => setPendingConfirmation(null)}
            onConfirm={() => {
              setPendingConfirmation(null);
              onManage("reset");
            }}
          />
        ) : null}
        {pendingConfirmation === "archive" ? (
          <ConfirmationDialog
            title="Lưu trữ câu hỏi này?"
            description="Câu hỏi sẽ rời khỏi lịch luyện. Lịch sử ôn và các lần dùng AI vẫn được giữ để bạn có thể kiểm tra hoặc khôi phục sau này."
            confirmLabel="Lưu trữ câu hỏi"
            busy={saving}
            onCancel={() => setPendingConfirmation(null)}
            onConfirm={() => {
              setPendingConfirmation(null);
              void onMutate("archive");
            }}
          />
        ) : null}
      </div>
    </details>
  );
}

function QuestionEditor({
  question,
  saving,
  onCancel,
  onSave,
}: {
  question: AdminQuestion;
  saving: boolean;
  onCancel: () => void;
  onSave: (content: EditableQuestionContent) => Promise<void>;
}) {
  const [responseMode, setResponseMode] = useState(
    question.responseMode ?? "text",
  );
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    question.estimatedMinutes,
  );
  const [prompt, setPrompt] = useState(question.prompt);
  const [code, setCode] = useState(question.code ?? "");
  const [hint, setHint] = useState(question.hint);
  const [shortAnswer, setShortAnswer] = useState(question.answer.short);
  const [detailedAnswer, setDetailedAnswer] = useState(
    question.answer.detailed,
  );
  const [required, setRequired] = useState(
    question.rubric.required.join("\n"),
  );
  const [bonus, setBonus] = useState(question.rubric.bonus.join("\n"));
  const [misconceptions, setMisconceptions] = useState(
    question.rubric.misconceptions.join("\n"),
  );

  function lines(value: string) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return (
    <form
      className="mt-5 rounded-2xl border border-[#356b58]/25 bg-[#f7f9f2] p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          type: question.type,
          responseMode,
          difficulty,
          estimatedMinutes,
          prompt,
          code: code.trim() || null,
          hint,
          answer: { short: shortAnswer, detailed: detailedAnswer },
          rubric: {
            required: lines(required),
            bonus: lines(bonus),
            misconceptions: lines(misconceptions),
          },
        }).catch(() => undefined);
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#356b58] uppercase">
            Trình sửa câu hỏi
          </p>
          <p className="mt-1 text-sm text-[#64736c]">
            Khi lưu, hệ thống sẽ tăng phiên bản và yêu cầu duyệt lại câu hỏi.
          </p>
        </div>
        <span className="font-mono text-xs text-[#64736c]">
          v{question.version} → v{question.version + 1}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EditorSelect
          label="Cách trả lời"
          value={responseMode}
          onChange={(value) => setResponseMode(value as typeof responseMode)}
          options={[["text", "Text"], ["code", "Code"]]}
        />
        <EditorSelect
          label="Độ khó"
          value={difficulty}
          onChange={(value) => setDifficulty(value as typeof difficulty)}
          options={[["beginner", "Dễ"], ["intermediate", "Trung bình"], ["advanced", "Khó"]]}
        />
        <label className="text-xs font-bold text-[#52645c]">
          Thời gian (phút)
          <input
            type="number"
            min={1}
            max={15}
            value={estimatedMinutes}
            onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
            className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm font-normal"
          />
        </label>
      </div>
      <EditorTextarea label="Đề bài" value={prompt} onChange={setPrompt} rows={4} />
      <EditorTextarea label="Mã mẫu (để trống nếu không có)" value={code} onChange={setCode} rows={7} mono required={false} />
      <EditorTextarea label="Gợi ý" value={hint} onChange={setHint} rows={3} />
      <EditorTextarea label="Đáp án ngắn" value={shortAnswer} onChange={setShortAnswer} rows={3} />
      <EditorTextarea label="Giải thích chi tiết" value={detailedAnswer} onChange={setDetailedAnswer} rows={6} />
      <div className="grid gap-3 lg:grid-cols-3">
        <EditorTextarea label="Tiêu chí bắt buộc (mỗi dòng một ý)" value={required} onChange={setRequired} rows={6} />
        <EditorTextarea label="Điểm cộng (mỗi dòng một ý)" value={bonus} onChange={setBonus} rows={6} required={false} />
        <EditorTextarea label="Hiểu lầm thường gặp (mỗi dòng một ý)" value={misconceptions} onChange={setMisconceptions} rows={6} required={false} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-[#173f35]/15 bg-white px-4 py-2 text-xs font-bold disabled:opacity-50">
          Hủy
        </button>
        <button type="submit" disabled={saving || !required.trim()} className="rounded-xl bg-[#173f35] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {saving ? "Đang lưu…" : "Lưu phiên bản mới"}
        </button>
      </div>
    </form>
  );
}

function EditorTextarea({ label, value, onChange, rows, mono = false, required = true }: { label: string; value: string; onChange: (value: string) => void; rows: number; mono?: boolean; required?: boolean }) {
  return (
    <label className="mt-3 block text-xs font-bold text-[#52645c]">
      {label}
      <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={`mt-1.5 w-full resize-y rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm font-normal leading-6 ${mono ? "font-mono" : ""}`} />
    </label>
  );
}

function EditorSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="text-xs font-bold text-[#52645c]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm font-normal">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function clientAdminStatus(
  status: AdminQuestion["status"],
  approved: boolean,
): AdminQuestionStatus {
  if (status === "archived") return "archived";
  if (status === "verified" || approved) return "active";
  if (status === "needs_review") return "stale";
  return "pending";
}

function QuestionDetails({ question }: { question: AdminQuestion }) {
  return (
    <>
      {question.code ? (
        <pre className="overflow-x-auto rounded-xl bg-[#10362d] p-4 text-xs leading-6 text-[#e8f4e9]">
          <code>{question.code}</code>
        </pre>
      ) : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InfoBlock label="Đáp án ngắn"><p>{question.answer.short}</p></InfoBlock>
        <InfoBlock label="Gợi ý"><p>{question.hint}</p></InfoBlock>
        <InfoBlock label="Giải thích"><p className="whitespace-pre-line">{question.answer.detailed}</p></InfoBlock>
        <InfoBlock label="Tiêu chí chấm"><ul className="list-disc space-y-1 pl-4">{question.rubric.required.map((item) => <li key={item}>{item}</li>)}</ul></InfoBlock>
      </div>
      {question.sourceHeadings.length ? (
        <p className="mt-4 text-xs text-[#64736c]">
          Nguồn: {question.sourceHeadings.join(" · ")}
        </p>
      ) : null}
      <div className="mt-4 rounded-xl border border-[#173f35]/10 bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-wide text-[#356b58] uppercase">
              Lịch Anki
            </p>
            <p className="mt-1 text-sm font-semibold">
              {learningLabels[question.learning.state]}
              {question.learning.suspended ? " · đang tạm dừng" : ""}
            </p>
          </div>
          <p className="font-mono text-xs text-[#64736c]">
            hạn {question.learning.dueOn ?? "—"} · khoảng cách{" "}
            {question.learning.intervalDays} ngày
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#64736c]">
          <span>{question.learning.reviewCount} lượt ôn</span>
          <span>· {question.learning.lapseCount} lần quên</span>
          {question.learning.leech ? (
            <span className="font-bold text-[#ba4b2f]">· Câu khó nhớ</span>
          ) : null}
        </div>
        <details className="mt-4 border-t border-[#173f35]/10 pt-3">
          <summary className="cursor-pointer text-xs font-bold text-[#356b58]">
            Lịch sử trả lời ({question.reviewHistory.length})
          </summary>
          {question.reviewHistory.length ? (
            <ol className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {question.reviewHistory.map((review) => (
                <li
                  key={`${review.questionId}:${review.reviewedOn}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#f3f4ee] px-3 py-2 text-xs"
                >
                  <span>{review.reviewedOn}</span>
                  <strong className="uppercase text-[#356b58]">
                    {reviewRatingLabels[review.rating] ?? review.rating}
                  </strong>
                  <span className="font-mono text-[#64736c]">→ {review.nextDueOn}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-xs text-[#64736c]">Chưa có lần ôn nào.</p>
          )}
        </details>
      </div>
    </>
  );
}

function CoveragePanel({ lessons }: { lessons: AdminDashboardSnapshot["lessons"] }) {
  const missing = lessons.filter((lesson) => lesson.currentQuestions === 0);
  const waiting = lessons.filter((lesson) => lesson.currentQuestions > 0 && lesson.activeQuestions === 0);
  return (
    <div className="rounded-[2rem] border border-[#173f35]/15 bg-white/65 p-6">
      <p className="font-mono text-xs font-bold tracking-[0.16em] text-[#356b58] uppercase">Mức bao phủ kiến thức</p>
      <h2 className="mt-2 text-xl font-semibold">Độ phủ bài học</h2>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#dfe5dc]"><div className="h-full bg-[#7fb43d]" style={{ width: `${lessons.length ? ((lessons.length - missing.length) / lessons.length) * 100 : 0}%` }} /></div>
      <p className="mt-3 text-sm text-[#64736c]">{lessons.length - missing.length}/{lessons.length} bài đã có câu hỏi khớp nguồn.</p>
      {missing.length ? <div className="mt-5"><p className="text-xs font-bold text-[#ba4b2f] uppercase">Chưa có câu ({missing.length})</p><ul className="mt-2 space-y-2 text-sm">{missing.slice(0, 8).map((lesson) => <li key={lesson.id} className="rounded-xl bg-[#fff4df] px-3 py-2"><span className="font-semibold">{lesson.title}</span><span className="ml-2 font-mono text-[10px] text-[#64736c]">{standardLabels[lesson.standard]}</span></li>)}</ul>{missing.length > 8 ? <p className="mt-2 text-xs text-[#64736c]">+{missing.length - 8} bài khác</p> : null}</div> : null}
      {waiting.length ? <p className="mt-4 text-xs text-[#86511f]">{waiting.length} bài đã có bản nháp nhưng chưa được duyệt.</p> : null}
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "default" }: { label: string; value: React.ReactNode; detail: string; tone?: "default" | "dark" | "warning" }) {
  const classes = tone === "dark" ? "bg-[#173f35] text-white" : tone === "warning" ? "bg-[#fff0d2] border border-[#ba4b2f]/20" : "bg-white/65 border border-[#173f35]/15";
  return <div className={`rounded-[1.6rem] p-5 ${classes}`}><p className={`text-xs font-bold uppercase tracking-[0.12em] ${tone === 'dark' ? 'text-[#d7ff91]' : 'text-[#64736c]'}`}>{label}</p><p className="mt-3 text-4xl font-semibold">{value}</p><p className={`mt-2 text-xs ${tone === 'dark' ? 'text-white/65' : 'text-[#64736c]'}`}>{detail}</p></div>;
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white/10 p-4"><p className="text-2xl font-semibold text-[#d7ff91]">{value}</p><p className="mt-1 text-xs text-white/65">{label}</p></div>;
}

function LearningBadge({ question }: { question: AdminQuestion }) {
  const label = question.learning.suspended
    ? "Tạm dừng"
    : question.learning.leech
      ? "Câu khó nhớ"
      : learningLabels[question.learning.state];
  const classes = question.learning.suspended
    ? "bg-[#e4e6e2] text-[#64736c]"
    : question.learning.state === "relearning" || question.learning.leech
      ? "bg-[#f1d6c9] text-[#8e3825]"
      : question.learning.state === "new"
        ? "bg-[#e8f0ff] text-[#315e91]"
        : "bg-[#e8f3dc] text-[#356b58]";
  return (
    <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${classes}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: AdminQuestionStatus }) {
  const classes = status === "active" ? "bg-[#d7ff91] text-[#356b58]" : status === "pending" ? "bg-[#ffe0a8] text-[#86511f]" : status === "stale" ? "bg-[#f1d6c9] text-[#8e3825]" : "bg-[#e4e6e2] text-[#64736c]";
  return <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${classes}`}>{statusLabels[status]}</span>;
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-xl bg-[#f3f4ee] p-4 text-sm leading-6"><p className="mb-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#356b58] uppercase">{label}</p>{children}</div>;
}

function QuestionClassificationBadges({
  question,
}: {
  question: AdminQuestion;
}) {
  return (
    <>
      <span className="rounded-full bg-[#edf0e8] px-2.5 py-1 font-mono text-[10px] font-bold uppercase">
        {questionDifficultyLabels[question.difficulty]}
      </span>
      <span className="rounded-full bg-[#edf0e8] px-2.5 py-1 font-mono text-[10px] font-bold uppercase">
        {questionResponseModeLabels[question.responseMode ?? "text"]}
      </span>
    </>
  );
}

function Filter({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: Array<[string, string]> }) {
  return <label><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-[#173f35]/15 bg-white px-3 py-2.5 text-sm outline-none focus:ring-3 focus:ring-[#d7ff91]">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
