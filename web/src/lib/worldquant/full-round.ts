import {
  drillsForCompetency,
  type WorldQuantDrill,
} from "./drills";
import {
  worldQuantRoleProfileById,
  type WorldQuantCompetencyKey,
  type WorldQuantRoleProfileId,
} from "./readiness";

export const WORLDQUANT_FULL_ROUND_VERSION = 1 as const;

export type WorldQuantFullRoundSection = {
  id: string;
  version: typeof WORLDQUANT_FULL_ROUND_VERSION;
  label: string;
  brief: string;
  competency: WorldQuantCompetencyKey;
  durationMinutes: number;
  englishVoice: boolean;
  drill: WorldQuantDrill;
};

export type WorldQuantFullRoundBlueprintRound = {
  roundId: string;
  roundVersion: typeof WORLDQUANT_FULL_ROUND_VERSION;
  drillId: string;
  drillVersion: WorldQuantDrill["version"];
  rubricTotal: number;
};

export type EnglishVoiceMetrics = {
  wordCount: number;
  fillerCount: number;
  wordsPerMinute: number;
};

export function remainingRoundSeconds(
  deadlineMs: number,
  nowMs: number,
) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function isRoundDeadlineExpired(
  deadlineMs: number | null,
  nowMs: number,
) {
  return (
    deadlineMs === null ||
    !Number.isFinite(deadlineMs) ||
    !Number.isFinite(nowMs) ||
    nowMs >= deadlineMs
  );
}

const sectionDefinitionsV1 = [
  {
    id: "cpp-depth",
    label: "C++ chuyên sâu",
    brief: "Bảo vệ lập luận về quyền sở hữu, vòng đời và ràng buộc API.",
    candidates: ["modern_cpp"],
    durationMinutes: 12,
    englishVoice: false,
  },
  {
    id: "coding-concurrency",
    label: "Viết mã và lập trình đồng thời",
    brief: "Lập luận về thuật toán có giới hạn và tính đúng đắn khi chạy đồng thời.",
    candidates: [
      "algorithms_data_structures",
      "concurrency_memory",
    ],
    durationMinutes: 16,
    englishVoice: false,
  },
  {
    id: "market-system-design",
    label: "Thiết kế hệ thống dữ liệu tick",
    brief: "Thiết kế luồng dữ liệu tin cậy khi phải giữ thứ tự và chịu tải.",
    candidates: [
      "tick_market_data",
      "distributed_data_platform",
    ],
    durationMinutes: 18,
    englishVoice: false,
  },
  {
    id: "delivery-automation",
    label: "Hệ thống dựng, tập lệnh và SDLC",
    brief: "Lập kế hoạch chuyển đổi có thể tái lập, có bằng chứng và phương án quay lui.",
    candidates: ["build_delivery", "scripting_automation"],
    durationMinutes: 12,
    englishVoice: false,
  },
  {
    id: "english-ownership",
    label: "Làm chủ công việc bằng tiếng Anh",
    brief: "Đưa ra quyết định rõ ràng đồng thời nêu minh bạch điều chưa chắc chắn và rủi ro.",
    candidates: ["ownership_communication"],
    durationMinutes: 10,
    englishVoice: true,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  brief: string;
  candidates: readonly WorldQuantCompetencyKey[];
  durationMinutes: number;
  englishVoice: boolean;
}[];

export function buildWorldQuantFullRound(
  roleProfileId: WorldQuantRoleProfileId,
): WorldQuantFullRoundSection[] {
  return buildWorldQuantFullRoundV1(roleProfileId);
}

export function worldQuantFullRoundBlueprintV1(
  roleProfileId: WorldQuantRoleProfileId,
) {
  const role = worldQuantRoleProfileById(roleProfileId);
  if (role.version !== 1) {
    throw new Error(
      `Unsupported role profile revision: ${roleProfileId}@${role.version}`,
    );
  }
  return {
    fullRoundVersion: WORLDQUANT_FULL_ROUND_VERSION,
    roleProfileVersion: role.version,
    rounds: buildWorldQuantFullRoundV1(roleProfileId).map(
      (round): WorldQuantFullRoundBlueprintRound => ({
        roundId: round.id,
        roundVersion: round.version,
        drillId: round.drill.id,
        drillVersion: round.drill.version,
        rubricTotal: round.drill.rubric.length,
      }),
    ),
  };
}

function buildWorldQuantFullRoundV1(
  roleProfileId: WorldQuantRoleProfileId,
): WorldQuantFullRoundSection[] {
  const role = worldQuantRoleProfileById(roleProfileId);
  return sectionDefinitionsV1.map((section) => {
    const candidates: readonly WorldQuantCompetencyKey[] =
      section.candidates;
    const competency = [...candidates].sort(
      (left, right) =>
        role.weights[right] - role.weights[left] ||
        candidates.indexOf(left) - candidates.indexOf(right),
    )[0];
    const drill = drillsForCompetency(competency).find(
      (candidate) => candidate.variant === "practice",
    );
    if (!drill) {
      throw new Error(
        `Missing practice scenario for full-round competency ${competency}`,
      );
    }
    return {
      id: `full-round-${section.id}`,
      version: WORLDQUANT_FULL_ROUND_VERSION,
      label: section.label,
      brief: section.brief,
      competency,
      durationMinutes: section.durationMinutes,
      englishVoice: section.englishVoice,
      drill,
    };
  });
}

export function analyzeEnglishVoice(
  transcript: string,
  elapsedSeconds: number,
): EnglishVoiceMetrics {
  const words =
    transcript
      .trim()
      .match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g) ?? [];
  const fillerPatterns = [
    /\byou know\b/gi,
    /\b(?:um+|uh+|erm+|hmm+)\b/gi,
    /\b(?:basically|actually|literally)\b/gi,
    /\blike\b/gi,
  ];
  const fillerCount = fillerPatterns.reduce(
    (total, pattern) =>
      total + (transcript.match(pattern)?.length ?? 0),
    0,
  );
  return {
    wordCount: words.length,
    fillerCount,
    wordsPerMinute:
      elapsedSeconds > 0
        ? Math.round((words.length * 60) / elapsedSeconds)
        : 0,
  };
}

export function analyzeRecordedEnglishVoice(
  voiceTranscript: string,
  microphoneElapsedMs: number,
): EnglishVoiceMetrics | null {
  if (
    !Number.isFinite(microphoneElapsedMs) ||
    microphoneElapsedMs <= 0
  ) {
    return null;
  }
  const metrics = analyzeEnglishVoice(
    voiceTranscript,
    microphoneElapsedMs / 1000,
  );
  return metrics.wordCount > 0 ? metrics : null;
}
