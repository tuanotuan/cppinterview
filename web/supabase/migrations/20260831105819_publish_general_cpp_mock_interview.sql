-- A question approval is an editorial publication decision, not personal
-- learning state. The application publishes only exact revisions approved by
-- a row in content_admins; enforce the same boundary for direct Data API use.

drop policy if exists "Users insert their own question approvals"
  on public.question_approvals;
create policy "Content admins insert their own question approvals"
on public.question_approvals
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (select public.is_content_admin())
);

drop policy if exists "Users update their own question approvals"
  on public.question_approvals;
create policy "Content admins update their own question approvals"
on public.question_approvals
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (select public.is_content_admin())
)
with check (
  (select auth.uid()) = user_id
  and (select public.is_content_admin())
);

drop policy if exists "Users delete their own question approvals"
  on public.question_approvals;
create policy "Content admins delete their own question approvals"
on public.question_approvals
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and (select public.is_content_admin())
);

comment on table public.question_approvals is
  'Exact-revision editorial publication decisions. Application publication reads must accept approvals from content_admins only.';

notify pgrst, 'reload schema';
