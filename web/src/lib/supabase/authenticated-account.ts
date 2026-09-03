const postgresUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function authenticatedAccountIdFromClaims(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const claims = value as {
    aud?: unknown;
    sub?: unknown;
    is_anonymous?: unknown;
  };
  const hasAuthenticatedAudience =
    claims.aud === "authenticated" ||
    (Array.isArray(claims.aud) && claims.aud.includes("authenticated"));
  const userId = typeof claims.sub === "string" ? claims.sub.trim() : "";
  const anonymous =
    claims.is_anonymous === true || claims.is_anonymous === "true";

  return hasAuthenticatedAudience && postgresUuidPattern.test(userId) && !anonymous
    ? userId
    : null;
}
