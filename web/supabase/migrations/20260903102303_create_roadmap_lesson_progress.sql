create table public.user_roadmap_lesson_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (
    char_length(lesson_id) between 1 and 160
    and lesson_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  status text not null check (status in ('learning', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

comment on table public.user_roadmap_lesson_states is
  'Owner-private Learning, Done, or Skipped state for roadmap lessons.';
comment on column public.user_roadmap_lesson_states.status is
  'Roadmap navigation state only; independent from the Anki question scheduler.';

create trigger user_roadmap_lesson_states_set_updated_at
before update on public.user_roadmap_lesson_states
for each row execute function public.set_updated_at();

alter table public.user_roadmap_lesson_states enable row level security;

revoke all on table public.user_roadmap_lesson_states
from public, anon, authenticated;
grant select, insert, update, delete
on table public.user_roadmap_lesson_states to authenticated;

-- Anonymous Auth identities also use the authenticated Postgres role. Keep
-- this as a restrictive policy so later permissive policies cannot bypass it.
create policy "Permanent accounts access roadmap lesson states"
on public.user_roadmap_lesson_states
as restrictive
for all
to authenticated
using (
  coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    false
  ) is false
)
with check (
  coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    false
  ) is false
);

create policy "Users read their own roadmap lesson states"
on public.user_roadmap_lesson_states
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users insert their own roadmap lesson states"
on public.user_roadmap_lesson_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own roadmap lesson states"
on public.user_roadmap_lesson_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their own roadmap lesson states"
on public.user_roadmap_lesson_states
for delete
to authenticated
using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
