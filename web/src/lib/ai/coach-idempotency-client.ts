import type {
  CoachFeedback,
  CoachFollowUpMessage,
} from "./contracts";

export type CoachEvaluationClientIdentity = {
  questionId: string;
  questionVersion: number;
  sourceRevision: string;
  candidateAnswer: string;
};

export async function coachEvaluationIdempotencyKey(
  identity: CoachEvaluationClientIdentity,
): Promise<string> {
  return deterministicUuid(
    [
      identity.questionId,
      String(identity.questionVersion),
      identity.sourceRevision,
      identity.candidateAnswer,
    ].join("\u001f"),
  );
}

export type CoachFollowUpClientIdentity = {
  questionId: string;
  questionVersion: number;
  sourceRevision: string;
  candidateAnswer: string;
  feedback: CoachFeedback;
  messages: CoachFollowUpMessage[];
};

export async function coachFollowUpIdempotencyKey(
  identity: CoachFollowUpClientIdentity,
): Promise<string> {
  return deterministicUuid(coachFollowUpCanonicalRequest(identity));
}

export function coachFollowUpCanonicalRequest(
  identity: CoachFollowUpClientIdentity,
) {
  return JSON.stringify({
    questionId: identity.questionId,
    questionVersion: identity.questionVersion,
    sourceRevision: identity.sourceRevision,
    candidateAnswer: identity.candidateAnswer,
    feedback: {
      score: identity.feedback.score,
      verdict: identity.feedback.verdict,
      summary: identity.feedback.summary,
      strengths: identity.feedback.strengths,
      coverage: identity.feedback.coverage.map((item) => ({
        criterion: item.criterion,
        status: item.status,
        feedback: item.feedback,
      })),
      corrections: identity.feedback.corrections,
      explanation: identity.feedback.explanation,
      nextStep: identity.feedback.nextStep,
      followUpQuestion: identity.feedback.followUpQuestion,
      suggestedRating: identity.feedback.suggestedRating,
      sourceSectionIds: identity.feedback.sourceSectionIds,
    },
    messages: identity.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });
}

async function deterministicUuid(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    ),
  );
  const bytes = digest.slice(0, 16);
  // UUIDv8 reserves the payload for application-defined deterministic IDs.
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
