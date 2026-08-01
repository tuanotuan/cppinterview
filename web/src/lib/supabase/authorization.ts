import type { User } from "@supabase/supabase-js";

export function isAllowedPracticeUser(user: User): boolean {
  const allowedUserIds = allowlist(process.env.ALLOWED_SUPABASE_USER_ID);
  if (allowedUserIds.includes(user.id.trim().toLowerCase())) return true;

  const allowedLogins = allowlist(process.env.ALLOWED_GITHUB_LOGIN);
  if (!allowedLogins.length) return false;

  return Boolean(
    user.identities?.some((identity) => {
      if (identity.provider !== "github") return false;
      const login = githubLogin(identity.identity_data);
      return login !== null && allowedLogins.includes(login);
    }),
  );
}

/**
 * Question-bank mutations are intentionally narrower than ordinary app access.
 * The GitHub provider identity is immutable for the current Supabase session;
 * never use editable user metadata for this owner check.
 */
export function isTuanotuanQuestionAdmin(user: User): boolean {
  return isAllowedPracticeUser(user) && Boolean(
    user.identities?.some((identity) => {
      if (identity.provider !== "github") return false;
      return githubLogin(identity.identity_data) === "tuanotuan";
    }),
  );
}

function githubLogin(identityData: Record<string, unknown> | undefined) {
  if (!identityData) return null;
  const login =
    stringValue(identityData.user_name) ??
    stringValue(identityData.preferred_username);
  return login?.toLowerCase() ?? null;
}

function stringValue(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function allowlist(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
