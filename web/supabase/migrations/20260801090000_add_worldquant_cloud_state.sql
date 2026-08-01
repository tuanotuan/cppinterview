-- Account-backed WorldQuant state. The browser remains the first durable copy;
-- these rows make a signed-in user's training evidence and daily mission portable.

create table if not exists public.worldquant_training_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worldquant_mission_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  role_profile_id text not null check (role_profile_id in ('tick-data-platform', 'cpp-data-platform', 'low-latency-cpp', 'senior-cpp-platform')),
  time_budget_minutes smallint not null check (time_budget_minutes between 15 and 120),
  snapshot jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_date, role_profile_id, time_budget_minutes)
);

alter table public.worldquant_training_states enable row level security;
alter table public.worldquant_mission_snapshots enable row level security;

drop policy if exists "worldquant_training_states_read_own" on public.worldquant_training_states;
create policy "worldquant_training_states_read_own"
  on public.worldquant_training_states for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "worldquant_mission_snapshots_read_own" on public.worldquant_mission_snapshots;
create policy "worldquant_mission_snapshots_read_own"
  on public.worldquant_mission_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.worldquant_training_states from anon, authenticated;
revoke all on public.worldquant_mission_snapshots from anon, authenticated;
grant select on public.worldquant_training_states to authenticated;
grant select on public.worldquant_mission_snapshots to authenticated;

create or replace function public.save_worldquant_training_state(
  p_state jsonb,
  p_expected_revision bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.worldquant_training_states%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_expected_revision < 0 then
    raise exception 'invalid expected revision' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('worldquant-training:' || v_user_id::text, 2026080109)
  );

  select * into v_current
  from public.worldquant_training_states
  where user_id = v_user_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      return jsonb_build_object('state', p_state, 'revision', 0, 'conflict', true);
    end if;
    insert into public.worldquant_training_states (user_id, state)
    values (v_user_id, p_state)
    returning * into v_current;
    return jsonb_build_object('state', v_current.state, 'revision', v_current.revision, 'conflict', false);
  end if;

  if v_current.revision <> p_expected_revision then
    return jsonb_build_object('state', v_current.state, 'revision', v_current.revision, 'conflict', true);
  end if;

  update public.worldquant_training_states
  set state = p_state, revision = revision + 1, updated_at = now()
  where user_id = v_user_id
  returning * into v_current;
  return jsonb_build_object('state', v_current.state, 'revision', v_current.revision, 'conflict', false);
end;
$$;

create or replace function public.save_worldquant_mission_snapshot(
  p_date date,
  p_role_profile_id text,
  p_time_budget_minutes smallint,
  p_snapshot jsonb,
  p_expected_revision bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.worldquant_mission_snapshots%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_expected_revision < 0 then
    raise exception 'invalid expected revision' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'worldquant-mission:' || v_user_id::text || ':' || p_date::text || ':' || p_role_profile_id || ':' || p_time_budget_minutes::text,
      2026080109
    )
  );

  select * into v_current
  from public.worldquant_mission_snapshots
  where user_id = v_user_id
    and mission_date = p_date
    and role_profile_id = p_role_profile_id
    and time_budget_minutes = p_time_budget_minutes
  for update;

  if not found then
    if p_expected_revision <> 0 then
      return jsonb_build_object('snapshot', p_snapshot, 'revision', 0, 'conflict', true);
    end if;
    insert into public.worldquant_mission_snapshots (
      user_id, mission_date, role_profile_id, time_budget_minutes, snapshot
    ) values (v_user_id, p_date, p_role_profile_id, p_time_budget_minutes, p_snapshot)
    returning * into v_current;
    delete from public.worldquant_mission_snapshots
    where ctid in (
      select ctid
      from public.worldquant_mission_snapshots
      where user_id = v_user_id
        and (mission_date, role_profile_id, time_budget_minutes) is distinct from (p_date, p_role_profile_id, p_time_budget_minutes)
      order by mission_date desc, created_at desc
      offset 23
    );
    return jsonb_build_object('snapshot', v_current.snapshot, 'revision', v_current.revision, 'conflict', false);
  end if;

  if v_current.revision <> p_expected_revision then
    return jsonb_build_object('snapshot', v_current.snapshot, 'revision', v_current.revision, 'conflict', true);
  end if;

  update public.worldquant_mission_snapshots
  set snapshot = p_snapshot, revision = revision + 1, updated_at = now()
  where user_id = v_user_id
    and mission_date = p_date
    and role_profile_id = p_role_profile_id
    and time_budget_minutes = p_time_budget_minutes
  returning * into v_current;
  delete from public.worldquant_mission_snapshots
  where ctid in (
      select ctid
      from public.worldquant_mission_snapshots
      where user_id = v_user_id
        and (mission_date, role_profile_id, time_budget_minutes) is distinct from (p_date, p_role_profile_id, p_time_budget_minutes)
      order by mission_date desc, created_at desc
      offset 23
  );
  return jsonb_build_object('snapshot', v_current.snapshot, 'revision', v_current.revision, 'conflict', false);
end;
$$;

revoke all on function public.save_worldquant_training_state(jsonb, bigint) from public;
revoke all on function public.save_worldquant_mission_snapshot(date, text, smallint, jsonb, bigint) from public;
grant execute on function public.save_worldquant_training_state(jsonb, bigint) to authenticated;
grant execute on function public.save_worldquant_mission_snapshot(date, text, smallint, jsonb, bigint) to authenticated;
