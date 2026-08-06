-- Private, active-time telemetry for the single content administrator. The
-- browser sends a short-lived tab UUID only while a phone tab is visible; no
-- user agent, IP address, device name, or page path is persisted.

create table if not exists public.admin_mobile_usage_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_session_id uuid not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, client_session_id)
);

create table if not exists public.admin_mobile_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  active_seconds integer not null default 0 check (active_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists admin_mobile_usage_daily_user_date_idx
  on public.admin_mobile_usage_daily (user_id, usage_date desc);

alter table public.admin_mobile_usage_sessions enable row level security;
alter table public.admin_mobile_usage_daily enable row level security;

revoke all on table public.admin_mobile_usage_sessions from public, anon, authenticated;
revoke all on table public.admin_mobile_usage_daily from public, anon, authenticated;
grant select on table public.admin_mobile_usage_daily to authenticated;

drop policy if exists "Content admin reads own mobile usage" on public.admin_mobile_usage_daily;
create policy "Content admin reads own mobile usage"
on public.admin_mobile_usage_daily for select to authenticated
using (
  (select auth.uid()) = user_id
  and (select public.is_content_admin())
);

create or replace function public.record_admin_mobile_usage_heartbeat(
  p_client_session_id uuid
)
returns table (active_seconds_added integer, usage_date date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_last_seen timestamptz;
  v_cursor timestamptz;
  v_chunk_end timestamptz;
  v_next_midnight timestamptz;
  v_elapsed_seconds integer := 0;
  v_chunk_seconds integer;
  v_usage_date date;
begin
  if v_user_id is null
     or not (select public.is_content_admin())
     or not exists (
       select 1
       from auth.identities as identity
       where identity.user_id = v_user_id
         and identity.provider = 'github'
         and lower(coalesce(
           identity.identity_data ->> 'user_name',
           identity.identity_data ->> 'preferred_username',
           ''
         )) = 'tuanotuan'
     ) then
    raise exception 'Only the content administrator can record mobile usage'
      using errcode = '42501';
  end if;

  select session.last_seen_at
    into v_last_seen
    from public.admin_mobile_usage_sessions as session
   where session.user_id = v_user_id
     and session.client_session_id = p_client_session_id
   for update;

  if not found then
    insert into public.admin_mobile_usage_sessions (
      user_id,
      client_session_id,
      last_seen_at
    ) values (
      v_user_id,
      p_client_session_id,
      v_now
    );

    return query
      select 0, (v_now at time zone 'Asia/Ho_Chi_Minh')::date;
    return;
  end if;

  update public.admin_mobile_usage_sessions
     set last_seen_at = v_now
   where user_id = v_user_id
     and client_session_id = p_client_session_id;

  -- The client heartbeats every 25 seconds. A larger gap means the tab was
  -- backgrounded, suspended, offline, or restored later, so do not infer time
  -- that was not observed as active.
  if v_now <= v_last_seen
     or v_now - v_last_seen > interval '45 seconds' then
    return query
      select 0, (v_now at time zone 'Asia/Ho_Chi_Minh')::date;
    return;
  end if;

  v_cursor := v_last_seen;
  while v_cursor < v_now loop
    v_usage_date := (v_cursor at time zone 'Asia/Ho_Chi_Minh')::date;
    v_next_midnight := ((v_usage_date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh');
    v_chunk_end := least(v_now, v_next_midnight);
    v_chunk_seconds := floor(extract(epoch from v_chunk_end - v_cursor))::integer;

    if v_chunk_seconds > 0 then
      insert into public.admin_mobile_usage_daily (
        user_id,
        usage_date,
        active_seconds,
        updated_at
      ) values (
        v_user_id,
        v_usage_date,
        v_chunk_seconds,
        v_now
      )
      on conflict (user_id, usage_date) do update
        set active_seconds = public.admin_mobile_usage_daily.active_seconds + excluded.active_seconds,
            updated_at = excluded.updated_at;

      v_elapsed_seconds := v_elapsed_seconds + v_chunk_seconds;
    end if;

    v_cursor := v_chunk_end;
  end loop;

  return query select v_elapsed_seconds, (v_now at time zone 'Asia/Ho_Chi_Minh')::date;
end;
$$;

revoke all on function public.record_admin_mobile_usage_heartbeat(uuid) from public, anon;
grant execute on function public.record_admin_mobile_usage_heartbeat(uuid) to authenticated;
