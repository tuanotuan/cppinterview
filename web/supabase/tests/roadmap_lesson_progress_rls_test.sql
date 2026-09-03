begin;

select plan(13);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'roadmap-owner@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'roadmap-other@example.com');

insert into public.user_roadmap_lesson_states (user_id, lesson_id, status) values
  ('11111111-1111-4111-8111-111111111111', 'cpp11-owner-lesson', 'learning'),
  ('22222222-2222-4222-8222-222222222222', 'cpp14-other-lesson', 'done');

select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.user_roadmap_lesson_states'::regclass
  ),
  'roadmap lesson states has RLS enabled'
);

select ok(
  not has_table_privilege(
    'anon',
    'public.user_roadmap_lesson_states',
    'select'
  ),
  'anon has no direct table access'
);

select ok(
  has_table_privilege('authenticated', 'public.user_roadmap_lesson_states', 'select')
    and has_table_privilege('authenticated', 'public.user_roadmap_lesson_states', 'insert')
    and has_table_privilege('authenticated', 'public.user_roadmap_lesson_states', 'update')
    and has_table_privilege('authenticated', 'public.user_roadmap_lesson_states', 'delete')
    and not has_table_privilege('authenticated', 'public.user_roadmap_lesson_states', 'truncate')
    and not has_table_privilege('authenticated', 'public.user_roadmap_lesson_states', 'references')
    and not has_table_privilege('authenticated', 'public.user_roadmap_lesson_states', 'trigger'),
  'authenticated receives only the operations used by the app'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}',
  true
);

select results_eq(
  $$select count(*) from public.user_roadmap_lesson_states$$,
  array[1::bigint],
  'a permanent account reads only its own state'
);

select lives_ok(
  $$insert into public.user_roadmap_lesson_states (user_id, lesson_id, status)
    values ('11111111-1111-4111-8111-111111111111', 'cpp17-new-lesson', 'learning')$$,
  'a permanent account inserts its own state'
);

select throws_like(
  $$insert into public.user_roadmap_lesson_states (user_id, lesson_id, status)
    values ('22222222-2222-4222-8222-222222222222', 'cpp17-stolen-lesson', 'done')$$,
  '%row-level security%',
  'an account cannot insert another owner state'
);

select results_eq(
  $$update public.user_roadmap_lesson_states
    set status = 'done'
    where user_id = '11111111-1111-4111-8111-111111111111'
      and lesson_id = 'cpp11-owner-lesson'
    returning status$$,
  array['done'::text],
  'an account updates its own state'
);

select is_empty(
  $$update public.user_roadmap_lesson_states
    set status = 'skipped'
    where user_id = '22222222-2222-4222-8222-222222222222'
    returning status$$,
  'an account cannot update another owner state'
);

select results_eq(
  $$delete from public.user_roadmap_lesson_states
    where user_id = '11111111-1111-4111-8111-111111111111'
      and lesson_id = 'cpp17-new-lesson'
    returning lesson_id$$,
  array['cpp17-new-lesson'::text],
  'an account deletes its own state'
);

select is_empty(
  $$delete from public.user_roadmap_lesson_states
    where user_id = '22222222-2222-4222-8222-222222222222'
    returning lesson_id$$,
  'an account cannot delete another owner state'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111","is_anonymous":true}',
  true
);

select is_empty(
  $$select lesson_id from public.user_roadmap_lesson_states$$,
  'an anonymous Auth identity cannot read roadmap state'
);

select throws_like(
  $$insert into public.user_roadmap_lesson_states (user_id, lesson_id, status)
    values ('11111111-1111-4111-8111-111111111111', 'cpp20-anonymous-lesson', 'learning')$$,
  '%row-level security%',
  'an anonymous Auth identity cannot insert roadmap state'
);

reset role;
select throws_like(
  $$insert into public.user_roadmap_lesson_states (user_id, lesson_id, status)
    values ('11111111-1111-4111-8111-111111111111', 'cpp23-invalid-status', 'pending')$$,
  '%user_roadmap_lesson_states_status_check%',
  'the status constraint rejects unsupported values'
);

select * from finish();
rollback;
