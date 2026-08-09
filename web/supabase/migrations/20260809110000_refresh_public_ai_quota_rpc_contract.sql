-- Reassert the server-only quota RPC privilege and force PostgREST to reload
-- the exact eight-argument signature used by the application.

revoke all on function public.reserve_public_ai_quota(
  text, text, text, text, uuid, text, text, integer
) from public, anon, authenticated;

grant execute on function public.reserve_public_ai_quota(
  text, text, text, text, uuid, text, text, integer
) to service_role;

notify pgrst, 'reload schema';
