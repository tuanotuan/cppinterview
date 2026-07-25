-- The Costs API reports the whole OpenAI project, including scheduled question
-- generation. Keep that provider total for observability/monthly accounting,
-- but base the interactive web allowance only on web requests finalized here.

update public.ai_usage_daily
set usage_floor_usd_micros = actual_usd_micros,
    updated_at = now()
where usage_floor_usd_micros <> actual_usd_micros;

create or replace function public.reconcile_ai_costs(
  p_daily_usd_micros bigint,
  p_monthly_usd_micros bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_usage_date date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_month_start date := date_trunc(
    'month',
    (now() at time zone 'Asia/Ho_Chi_Minh')
  )::date;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_daily_usd_micros < 0 or p_monthly_usd_micros < 0 then
    raise exception 'Provider costs cannot be negative';
  end if;

  insert into public.ai_usage_monthly (user_id, month_start)
  values (v_user_id, v_month_start)
  on conflict (user_id, month_start) do nothing;

  update public.ai_usage_monthly
  set usage_floor_usd_micros = greatest(
        usage_floor_usd_micros,
        actual_usd_micros,
        provider_usd_micros
          + greatest(
              0,
              actual_usd_micros - provider_actual_baseline_usd_micros
            ),
        p_monthly_usd_micros
      ),
      provider_usd_micros = p_monthly_usd_micros,
      provider_actual_baseline_usd_micros = actual_usd_micros,
      provider_synced_at = now(),
      updated_at = now()
  where user_id = v_user_id and month_start = v_month_start;

  insert into public.ai_usage_daily (user_id, usage_date)
  values (v_user_id, v_usage_date)
  on conflict (user_id, usage_date) do nothing;

  update public.ai_usage_daily
  set
      -- Daily floor is intentionally web-only. Resetting it on every sync
      -- self-heals any provider-contaminated value left by a rolling deploy.
      usage_floor_usd_micros = actual_usd_micros,
      provider_usd_micros = p_daily_usd_micros,
      provider_actual_baseline_usd_micros = actual_usd_micros,
      provider_synced_at = now(),
      updated_at = now()
  where user_id = v_user_id and usage_date = v_usage_date;
end;
$$;

create or replace function public.reserve_web_ai_budget(
  p_reservation_usd_micros bigint,
  p_daily_limit_usd_micros bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_usage_date date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_month_start date := date_trunc(
    'month',
    (now() at time zone 'Asia/Ho_Chi_Minh')
  )::date;
  v_daily_actual bigint;
  v_daily_floor bigint;
  v_daily_reserved bigint;
  v_daily_used bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_reservation_usd_micros <= 0
    or p_daily_limit_usd_micros <= 0 then
    raise exception 'Budget values must be positive';
  end if;

  insert into public.ai_usage_monthly (user_id, month_start)
  values (v_user_id, v_month_start)
  on conflict (user_id, month_start) do nothing;

  insert into public.ai_usage_daily (user_id, usage_date)
  values (v_user_id, v_usage_date)
  on conflict (user_id, usage_date) do nothing;

  -- Match finalize/release lock order and retain the monthly reservation
  -- counter for their existing signatures. Monthly admission is enforced by
  -- the OpenAI project hard-spend limit, not this web-only daily RPC.
  perform 1
  from public.ai_usage_monthly
  where user_id = v_user_id and month_start = v_month_start
  for update;

  select
    actual_usd_micros,
    usage_floor_usd_micros,
    reserved_usd_micros
  into
    v_daily_actual,
    v_daily_floor,
    v_daily_reserved
  from public.ai_usage_daily
  where user_id = v_user_id and usage_date = v_usage_date
  for update;

  v_daily_used := greatest(v_daily_actual, v_daily_floor);

  if v_daily_used + v_daily_reserved + p_reservation_usd_micros
    > p_daily_limit_usd_micros then
    return jsonb_build_object(
      'status', 'daily_exceeded',
      'usage_date', v_usage_date,
      'month_start', v_month_start
    );
  end if;

  update public.ai_usage_monthly
  set reserved_usd_micros = reserved_usd_micros + p_reservation_usd_micros,
      updated_at = now()
  where user_id = v_user_id and month_start = v_month_start;

  update public.ai_usage_daily
  set reserved_usd_micros = reserved_usd_micros + p_reservation_usd_micros,
      usage_floor_usd_micros = greatest(
        usage_floor_usd_micros,
        actual_usd_micros
      ),
      updated_at = now()
  where user_id = v_user_id and usage_date = v_usage_date;

  return jsonb_build_object(
    'status', 'allowed',
    'usage_date', v_usage_date,
    'month_start', v_month_start
  );
end;
$$;

-- Keep rolling deployments safe: old app instances still call this signature.
-- The monthly argument remains for wire compatibility but is accounting-only.
create or replace function public.reserve_ai_budget(
  p_reservation_usd_micros bigint,
  p_monthly_limit_usd_micros bigint,
  p_daily_limit_usd_micros bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_monthly_limit_usd_micros <= 0 then
    raise exception 'Budget values must be positive';
  end if;

  return public.reserve_web_ai_budget(
    p_reservation_usd_micros,
    p_daily_limit_usd_micros
  );
end;
$$;

comment on function public.reconcile_ai_costs(bigint, bigint) is
  'Stores project-wide provider costs while keeping the daily web usage floor isolated from background OpenAI jobs.';

comment on function public.reserve_web_ai_budget(bigint, bigint) is
  'Reserves interactive web AI usage against web-finalized cost for the Vietnam calendar day.';

comment on function public.reserve_ai_budget(bigint, bigint, bigint) is
  'Compatibility wrapper that reserves interactive web AI usage against the web-only Vietnam daily quota.';

revoke all on function public.reconcile_ai_costs(bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.reserve_web_ai_budget(bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.reserve_ai_budget(bigint, bigint, bigint)
  from public, anon, authenticated;

grant execute on function public.reconcile_ai_costs(bigint, bigint)
  to authenticated;
grant execute on function public.reserve_web_ai_budget(bigint, bigint)
  to authenticated;
grant execute on function public.reserve_ai_budget(bigint, bigint, bigint)
  to authenticated;
