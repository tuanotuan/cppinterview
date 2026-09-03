import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type PasswordCapability = {
  hasPassword: boolean;
  source: "database" | "auth-provider-fallback";
};

/**
 * Read the authoritative password capability mirrored from auth.users.
 *
 * The provider fallback keeps an older app/database rolling deploy usable,
 * but it is not authoritative for OAuth-first accounts because Supabase may
 * not add an email identity when a password is attached later.
 */
export async function readPasswordCapability(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "app_metadata" | "identities">,
): Promise<PasswordCapability> {
  const { data, error } = await supabase
    .from("account_auth_capabilities")
    .select("has_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!error && typeof data?.has_password === "boolean") {
    return { hasPassword: data.has_password, source: "database" };
  }

  return {
    hasPassword: hasEmailProvider(user),
    source: "auth-provider-fallback",
  };
}

function hasEmailProvider(
  user: Pick<User, "app_metadata" | "identities">,
) {
  if (user.identities?.some((identity) => identity.provider === "email")) {
    return true;
  }

  const providers = user.app_metadata.providers;
  if (Array.isArray(providers) && providers.includes("email")) return true;
  return user.app_metadata.provider === "email";
}
