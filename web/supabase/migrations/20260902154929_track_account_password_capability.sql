-- Supabase does not expose auth.users.encrypted_password through the Auth API,
-- and setting a password on an OAuth-first account does not consistently add
-- an email identity. Mirror only the non-sensitive capability bit so the app
-- can render "Set password" versus "Change password" accurately.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.account_auth_capabilities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  has_password boolean not null
);

comment on table public.account_auth_capabilities is
  'Owner-private authentication capability flags derived from auth.users.';
comment on column public.account_auth_capabilities.has_password is
  'True when auth.users.encrypted_password contains a password hash.';

alter table public.account_auth_capabilities enable row level security;

revoke all on table public.account_auth_capabilities
from public, anon, authenticated;
grant select on table public.account_auth_capabilities to authenticated;

create policy "Users read their own auth capabilities"
on public.account_auth_capabilities
for select
to authenticated
using ((select auth.uid()) = user_id);

create function private.sync_account_auth_capabilities()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_auth_capabilities (user_id, has_password)
  values (
    new.id,
    coalesce(new.encrypted_password, '') <> ''
  )
  on conflict (user_id) do update
  set has_password = excluded.has_password;

  return new;
end;
$$;

revoke execute on function private.sync_account_auth_capabilities()
from public, anon, authenticated;

create trigger sync_account_auth_capabilities
after insert or update of encrypted_password on auth.users
for each row execute function private.sync_account_auth_capabilities();

insert into public.account_auth_capabilities (user_id, has_password)
select
  "user".id,
  coalesce("user".encrypted_password, '') <> ''
from auth.users as "user"
on conflict (user_id) do update
set has_password = excluded.has_password;

notify pgrst, 'reload schema';
