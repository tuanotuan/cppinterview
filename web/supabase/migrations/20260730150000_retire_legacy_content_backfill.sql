-- The one-time legacy backfill selected its initial content administrator from
-- user-editable metadata. Current content synchronization uses
-- sync_content_question_bank and no longer needs this provisioning path.
-- Retire execution so mutable metadata cannot grant future admin membership.

create or replace function public.backfill_content_question_bank(
  p_manifest jsonb,
  p_admin_github_login text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise sqlstate '55000'
    using message =
      'backfill_content_question_bank is retired; use sync_content_question_bank';
end;
$$;

revoke all on function public.backfill_content_question_bank(
  jsonb, text
) from public, anon, authenticated, service_role;

comment on function public.backfill_content_question_bank(
  jsonb, text
) is
  'Retired one-time backfill. Do not use for administrator provisioning; current synchronization uses sync_content_question_bank.';
