-- The DB-native question-bank loader needs the immutable source revision for
-- every signed-in learner. Keeping this row admin-only made a newly created
-- OAuth account fail SSR after the callback, even though it had no write
-- access and should be able to read verified questions.
--
-- This exposes only repository/snapshot metadata. Content mutations remain
-- guarded by the existing administrator-only policies and RPCs.
begin;

drop policy if exists "Content admins read store state"
  on public.content_store_state;
drop policy if exists "Authenticated users read content store state"
  on public.content_store_state;

create policy "Authenticated users read content store state"
on public.content_store_state for select to authenticated
using (true);

revoke all on table public.content_store_state from public, anon, authenticated;
grant select on table public.content_store_state to authenticated;

commit;
