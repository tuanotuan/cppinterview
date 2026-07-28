alter table public.coach_attempts
  drop constraint if exists coach_attempts_candidate_answer_check;

comment on column public.coach_attempts.candidate_answer is
  'Candidate answer submitted to the AI coach. Empty means the candidate does not know; no product-level character limit is enforced.';
