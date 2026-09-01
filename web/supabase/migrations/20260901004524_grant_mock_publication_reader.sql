-- The general C++ mock interview is assembled on the server from the current
-- content snapshot and exact editorial approvals. Supabase's service_role
-- bypasses RLS, but it still needs explicit object privileges. The current
-- content views use security_invoker, so grant their underlying tables too.

grant usage on schema public to service_role;

grant select on table
  public.content_admins,
  public.question_approvals,
  public.content_store_state,
  public.content_lessons,
  public.content_lesson_revisions,
  public.content_questions,
  public.content_question_revisions,
  public.content_question_translations
to service_role;

grant select on table
  public.content_current_lessons,
  public.content_current_questions,
  public.content_current_question_translations
to service_role;

notify pgrst, 'reload schema';
