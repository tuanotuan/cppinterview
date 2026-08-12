import type { User } from "@supabase/supabase-js";

export function isAllowedPracticeUser(user: User): boolean {
  // Recall is open to every authenticated Supabase account. RLS keeps cloud
  // data private to its account; owner-only actions remain checked below.
  return user.aud === "authenticated" && Boolean(user.id.trim());
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
