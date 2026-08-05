import "server-only";

import type { User } from "@supabase/supabase-js";

import {
  completePublicAiQuota,
  createPublicAiDeviceToken,
  createPublicAiQuotaAdminClient,
  markPublicAiQuotaOutcomeUnknown,
  publicAiQuotaIdentityHash,
  readPublicAiClientIp,
  releasePublicAiQuota,
  reservePublicAiQuota,
  type PublicAiQuotaRequestKind,
} from "./public-ai-quota.server";

export type PublicAiAdmission = {
  client: ReturnType<typeof createPublicAiQuotaAdminClient>;
  reservationId: string;
  leaseToken: string;
  deviceCookie: string | null;
  remaining: number | null;
  resetsAt: string | null;
};

export class PublicAiIdentityUnavailableError extends Error {
  constructor() {
    super("A trusted public AI identity is unavailable");
    this.name = "PublicAiIdentityUnavailableError";
  }
}

export class PublicAiRequestInProgressError extends Error {
  constructor() {
    super("A matching public AI request is already running");
    this.name = "PublicAiRequestInProgressError";
  }
}

export class PublicAiRequestAlreadyCompletedError extends Error {
  constructor() {
    super("A matching public AI request has already completed");
    this.name = "PublicAiRequestAlreadyCompletedError";
  }
}

export class PublicAiRequestOutcomeUnknownError extends Error {
  constructor() {
    super("A matching public AI request has an unknown provider outcome");
    this.name = "PublicAiRequestOutcomeUnknownError";
  }
}

export function isPublicAiEnabled() {
  return process.env.PUBLIC_AI_ENABLED?.trim().toLowerCase() === "true";
}

export async function reservePublicAiAdmission({
  request,
  user,
  idempotencyKey,
  requestFingerprint,
  requestKind,
}: {
  request: Request;
  user: User | null;
  idempotencyKey: string;
  requestFingerprint: string;
  requestKind: PublicAiQuotaRequestKind;
}): Promise<PublicAiAdmission> {
  const ip = readPublicAiClientIp(request);
  if (!ip) throw new PublicAiIdentityUnavailableError();

  const existingDeviceToken = readDeviceCookie(request.headers.get("cookie"));
  const deviceToken = existingDeviceToken ?? createPublicAiDeviceToken();
  const ipHash = publicAiQuotaIdentityHash("ip", ip);
  const deviceHash = publicAiQuotaIdentityHash("device", deviceToken);
  const accountHash = user
    ? publicAiQuotaIdentityHash("account", user.id)
    : null;
  const principalHash = accountHash ?? deviceHash;
  const client = createPublicAiQuotaAdminClient();
  const reservation = await reservePublicAiQuota(client, {
    principalHash,
    ipHash,
    deviceHash,
    accountHash,
    idempotencyKey,
    requestFingerprint,
    requestKind,
  });

  if (reservation.status === "reserved") {
    if (!reservation.isNew) throw new PublicAiRequestInProgressError();
    if (!reservation.reservationId || !reservation.leaseToken) {
      throw new PublicAiRequestInProgressError();
    }
    return {
      client,
      reservationId: reservation.reservationId,
      leaseToken: reservation.leaseToken,
      deviceCookie: existingDeviceToken ? null : deviceToken,
      remaining: reservation.remaining,
      resetsAt: reservation.resetsAt,
    };
  }
  if (reservation.status === "completed") {
    throw new PublicAiRequestAlreadyCompletedError();
  }
  if (reservation.status === "outcome_unknown") {
    throw new PublicAiRequestOutcomeUnknownError();
  }
  throw new PublicAiRequestInProgressError();
}

export async function completePublicAiAdmission(admission: PublicAiAdmission) {
  const status = await completePublicAiQuota(
    admission.client,
    admission.reservationId,
  );
  if (status !== "completed") {
    throw new Error("Public AI quota completion was not confirmed");
  }
}

export async function markPublicAiAdmissionOutcomeUnknown(
  admission: PublicAiAdmission,
) {
  await markPublicAiQuotaOutcomeUnknown(
    admission.client,
    admission.reservationId,
  );
}

export async function releasePublicAiAdmission(admission: PublicAiAdmission) {
  await releasePublicAiQuota(
    admission.client,
    admission.reservationId,
    admission.leaseToken,
  );
}

export function attachPublicAiDeviceCookie(
  response: Response,
  admission: PublicAiAdmission | null,
) {
  if (!admission?.deviceCookie) return response;
  response.headers.append(
    "Set-Cookie",
    [
      "recall_public_ai_device_v1=" + admission.deviceCookie,
      "Path=/",
      "Max-Age=15552000",
      "HttpOnly",
      "SameSite=Lax",
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return response;
}

function readDeviceCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  for (const item of cookieHeader.split(";")) {
    const [name, ...value] = item.trim().split("=");
    if (name !== "recall_public_ai_device_v1") continue;
    const token = value.join("=");
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
  return null;
}
