# Supabase setup

Supabase stores private cross-device progress, AI and mock-interview history,
question approvals and immutable revisions, content automation state, code-runner
admission, the Mistake Inbox, and atomic daily/monthly AI accounting.

1. Create a free project at <https://database.new>.
2. Copy the Project URL and publishable key into `web/.env.local`.
3. Link the CLI and apply the tracked migration:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

4. In Supabase Authentication > Providers, enable **Email**. Keep email
   confirmation enabled in production so a new address must be verified before
   it can sign in.
5. Optional: enable GitHub and/or Google OAuth. For either provider, create the
   OAuth client in its provider console, then set its callback URL to the URL
   displayed by Supabase, normally
   `https://<project-ref>.supabase.co/auth/v1/callback`. For Google, add the
   site origin (production URL and `http://localhost:3000`) under Authorized
   JavaScript origins, then copy the Google Client ID and Client Secret into
   Supabase Authentication > Providers > Google.
6. In Supabase Authentication > URL Configuration, set the production Site URL
   and add both `/auth/callback` and `/auth/confirm` for production and
   `http://localhost:3000`. The email/password registration flow sends its
   confirmation link to `/auth/confirm`.
7. In Supabase Authentication > Emails > **Reset Password**, replace the
   default recovery-link body with an OTP body containing `{{ .Token }}` so
   cppinterview can verify the code on `/auth/reset-password`:

   ```html
   <h2>Khôi phục mật khẩu cppinterview</h2>
   <p>Nhập mã này trên trang khôi phục mật khẩu. Không chia sẻ mã cho ai.</p>
   <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
   <p>Nếu bạn không yêu cầu đổi mật khẩu, có thể bỏ qua email này.</p>
   ```

   Đặt subject, ví dụ: `{{ .Token }} là mã khôi phục cppinterview`. Không để
   `{{ .ConfirmationURL }}` là cách duy nhất để khôi phục: trang web xác minh
   OTP `recovery` trước khi cho đặt mật khẩu mới. Khi thử trên gói Supabase mặc
   định, kiểm tra cả Spam và giới hạn gửi email; dùng SMTP riêng khi cần gửi
   đáng tin cậy hơn.

   OAuth-only accounts (for example, users whose only provider is Google or
   GitHub) do not receive a password-recovery token because they have no email
   identity. After signing in with the provider, they can add a password at
   `/auth/set-password`; that page calls `auth.updateUser({ password })` and
   keeps the provider session authenticated.

Recall is open to every authenticated Supabase account. RLS keeps reviews,
progress, AI history, and mock history private to the account in its JWT.
Admin-only controls remain restricted in application code to the immutable
GitHub identity `tuanotuan`; do not treat editable user metadata as ownership.

The migrations enable RLS. Authenticated users can only read and mutate rows
whose `user_id` matches their JWT identity. Question approvals are bound to an
exact question version and source hash, so a source edit automatically sends the
question back to the Review Queue.

The AI budget migrations reserve a conservative amount before each web AI call,
record the actual response-token cost afterward, and reconcile it against the
official OpenAI Costs API. Web admission uses only finalized interactive request
cost for the Vietnam calendar day. The Costs API reports the whole project, so
scheduled draft generation remains in monthly/project accounting but cannot
drain the web daily quota. Keep the OpenAI project hard-spend limit at the same
value as `OPENAI_MONTHLY_BUDGET_USD` for the authoritative monthly backstop.

The reconciliation baseline records the realtime counter at each Billing sync.
Effective spend is the provider total plus only the realtime delta created after
that baseline, so new requests are visible immediately without counting settled
usage twice.

`20260729120000_isolate_web_daily_ai_quota.sql` clears provider-contaminated
daily floors, keeps provider cost as project observability, and adds
`reserve_web_ai_budget(...)` for the earlier aggregate protocol.
`20260730190000_ai_budget_reservation_ledger.sql` supersedes that admission path
with exact account-scoped reservation UUIDs and a durable dispatch marker. It
revokes every aggregate reserve/finalize/release overload, so mismatched old app
code fails closed instead of mutating an anonymous aggregate.

The ledger limits one reservation to 500,000 USD micros, the caller-supplied
daily limit to 4,000,000 micros, and one account to 256 reservation rows per
Vietnam day. Finalization also bounds actual cost at 4,000,000 micros, each token
counter at 10,000,000, and the model label at 200 bytes. A user/day index keeps
the row-count guard bounded. Apply the migration with the matching app version;
the migrations in this repository have not been integration-tested against a
local PostgreSQL instance.

Gemini fallback requests are counted separately in `gemini_usage_daily`; they do
not reduce the OpenAI dollar budget. `ai_provider_settings` stores the owner's
Admin toggle for that fallback. Both tables remain private under RLS.

`user_question_states` is the Anki-style current-state projection for each
user/question pair. `practice_reviews` is durable per-question history inside
the current reset generation. An explicit reset deletes that question's prior
rows and rotates `history_reset_token`; a same-day row for an obsolete
version/source hash may be replaced atomically. The Phase A migration backfills
practiced questions as Review or Relearning; unseen questions are created
lazily as New when the Phase B scheduler is wired to the practice flow.

Phase B extends `practice_reviews` with the state produced by each rating and
uses `record_practice_review(...)` to update review history plus
`user_question_states` in one database transaction. The browser may calculate
an optimistic interval, but the RPC remains authoritative for cloud progress.
`20260730200000_serialize_practice_reviews.sql` adds a per-account/question
advisory lock and returns `recorded`, `already_recorded`, or `history_recorded`
with the authoritative rating. It returns terminal `reset_discarded` for a
review created against another reset generation, so a stale device removes its
local copy instead of restoring deleted progress. Each reset creates a UUID;
every review in that history generation keeps the same UUID until the next
reset, including when reset and review happen on the same Vietnam date. The
first rating for an exact question/day/version/hash/generation wins atomically
across tabs and devices. A same-day row for stale content is replaced; a new
backdated offline review increases the aggregate review count but does not move
the authoritative due date, interval, or latest-review date backwards.

`20260730200000` is the expand stage: it adds the generation columns and keeps a
temporary five-argument compatibility wrapper. Deploy the backward-compatible
app first. `20260730220000_finalize_practice_history_generations.sql` then
backfills one generation per existing question history, serializes reset with
review writes, removes the old cutoff-clearing trigger, and drops the wrapper.
The app falls back to the legacy projection/RPC only for a confirmed missing
column/function before these migrations; generation-bearing reviews never use
the legacy RPC.

Phase C adds owner-only scheduling operations through
`manage_question_schedule(...)`: suspend, unsuspend, reset, and reschedule.
Reset removes that question's review history, records the legacy cutoff, and
rotates its durable generation token so stale browser storage on another device
cannot silently restore the deleted progress.

Phase D adds a server-rendered learning analytics page from the existing review
history and question-state projection. Retention, 28-day activity, 14-day due
forecast, deck distribution, and weak-topic ranking require no new table, RPC,
or AI request, so this phase has no additional Supabase migration.

`question_overrides` stores owner-only edits and archive flags over the generated
question manifest. Editing increments the effective question version and
requires a new approval; archiving hides the question without deleting review or
coach history. RLS keeps the overlay private to the authenticated owner.

`20260828064241_permanently_reject_queued_questions.sql` adds the separate,
irreversible Admin rejection path. It stores only an ID/version/source-hash
tombstone plus the rejecting account for audit, exposes only rejected IDs to
authenticated readers, and keeps source/revision history append-only. Deploy the
compatible app first; until the migration exists, reads behave as if there are no
tombstones and rejection attempts fail closed. Apply the migration only through
the normal authorized deployment flow.

## Hybrid content bank foundation

`20260723090000_create_content_question_bank.sql` adds the Phase A database
foundation without changing the production content source. Git remains the source
of truth for `knowledge.md` and `main.cpp`; Supabase will hold derived, immutable
lesson and question revisions in later phases.

The new tables are additive. They do not import or mutate the existing YAML bank,
approvals, practice history, Anki state, coach attempts, or overrides. The app
continues to default to `QUESTION_STORE=repo` until a later cutover.

Lesson revisions, question revisions, and question audit events are append-only.
Current pointers and lifecycle state live on `content_lessons` and
`content_questions`. `content_generation_jobs` and `content_sync_runs` provide the
idempotency and retry ledger for the future Git-to-Supabase automation.

Only authenticated readers that pass RLS can see content. Browser roles receive no
direct write grants. Provision `content_admins` explicitly with an immutable
Supabase Auth user UUID; do not expose a service-role key through a `NEXT_PUBLIC_`
variable.

## Retired content bank backfill

`20260723130000_backfill_content_question_bank.sql` was a one-time Phase B
importer and must not be called again. Migration
`20260730150000_retire_legacy_content_backfill.sql` replaces it with an
unconditional SQLSTATE `55000` retirement error and revokes every API role.
Current repository-to-database updates use `sync_content_question_bank` through
the `content:sync` command described below.

The monotonic AI budget migration stores a conservative usage floor before each
OpenAI Billing reconciliation. Billing data can lag realtime requests, but that
lag can no longer make used cost decrease or remaining daily quota increase.

## Content bank shadow reads

`20260724100000_create_content_shadow_views.sql` adds the current-lesson view used
by Phase C. Apply it after the Phase B backfill, then set `QUESTION_STORE=shadow`
in Vercel Production. Shadow mode reads both stores and logs any mismatch, but it
continues serving the Git manifest, so a database problem cannot change the live
practice bank.

`20260724120000_fix_content_shadow_parity.sql` aligns stale-draft status handling
with the Git manifest. Apply it immediately after the shadow-view migration.

## Phase D automated sync and cutover

`20260725100000_sync_content_question_bank.sql` installs the transactional,
service-role-only `sync_content_question_bank(...)` RPC. It also stores the exact
manifest order and source revision, so DB reads reproduce the committed Git
snapshot rather than merely containing equivalent rows. The RPC is idempotent by
repository commit, rejects question ID/version checksum conflicts, archives rows
missing from the new snapshot, and advances all current pointers atomically.

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets. Do
not add the service-role key to Vercel or any `NEXT_PUBLIC_` variable. After each
safe content refresh on `main`, the workflow runs:

```bash
npm run content:sync
```

For a local payload/checksum dry run that never contacts Supabase:

```bash
npm run content:sync:check
```

Cut over only after the main-branch sync succeeds and
`/api/admin/content-parity` returns `readyForCutover: true` (which requires both
content parity and an exact source revision). Set Vercel `QUESTION_STORE=db` and redeploy. DB
mode applies the same private Admin overrides after loading the base snapshot and
fails closed on missing/invalid state. Rollback is a Vercel-only change back to
`QUESTION_STORE=shadow`; immutable revisions and sync history remain intact.

While signed in as the configured owner, open `/api/admin/content-parity`. The
response must contain `"ok": true` and empty missing/extra/mismatched ID arrays
before a later phase changes `QUESTION_STORE` to `db`. Database mode fails closed
when the Supabase read or schema validation fails; do not enable it in Phase C.

## Phase E DB-native question generation

`20260726100000_create_db_native_generation_pipeline.sql` keeps Git as the source
of truth for lessons while moving newly generated question drafts out of YAML.
Apply it only after the Phase D migration and successful DB cutover.

The migration adds immutable question ownership, a repository-only parity view,
and service-role RPCs to enqueue, lease, complete, fail, and retry generation
jobs. Completion inserts the question, its immutable revision, provenance, and
audit event in one transaction. Generated IDs use a separate `-ai-NNN`
namespace, so future repository questions cannot silently collide with them.
The ownership guard prevents repository sync from changing a DB-owned row to
`archived`. If its parent lesson is archived, the effective current-question
view still reports that question as archived without deleting its row,
revisions, or audit history.

The main workflow now runs `content:refresh`, `content:sync`, and then
`content:generate:db`. A lesson revision is enqueued only when it has no current,
non-archived question grounded in the same source hash. Jobs use a 10-minute
lease and dead-letter after five attempts. Automatic retry/fallback is allowed
only after a confirmed provider 429; timeout, connection reset, DNS failure or
5xx stops the job for administrator review because a paid result may already
exist. OpenAI Luna is primary; Gemini requires `GEMINI_API_KEY`.

`20260730210000_harden_content_generation_dispatch.sql` adds retry protocol v2.
The worker preflights that exact protocol, then passes both protocol v2 and the
exact generator version to every claim. The migration removes the old claim and
failure signatures, so an older worker cannot acquire or reopen v2 work. It
also moves every legacy `deferred` and `pending` row to `dead_letter`, because
protocol v1 could defer or erase the evidence for an ambiguous timeout, 5xx
response, or internally retried request and could not distinguish that history
from untouched pending work.

Enqueue, claim, completion, and manual rollover resolution share one global
advisory lock; enqueue, claim, and retry additionally serialize the exact
lesson/source pair across all generator versions. A completed exact-source
question closes queued siblings before another claim. A current-version job is
blocked by any other-version `pending`, `deferred`, or `running` sibling, or by
a terminal sibling with an unconfirmed provider outcome. The worker returns
`generation_history_conflict` without calling AI. An administrator must
explicitly close the obsolete row; pending rows are eligible for this action
only when their generator version differs from the deployed version. Ambiguous
rows still require the separate duplicate-cost confirmation. If no matching
current-version job exists, generation returns `generator_version_mismatch` and
asks the operator to run `content:sync`.

The worker durably marks the current lease immediately before every OpenAI or
Gemini request and keeps a bounded history of the exact provider, model, time,
and lease. An expired undispatched lease is safe to reclaim; an expired
dispatched lease becomes terminal `dead_letter`. Only a confirmed provider 429
clears the marker for an automatic retry. Every other post-dispatch failure
remains terminal. The Admin retry endpoint first asks the database whether the
exact row needs confirmation; it never infers ambiguity from a status label.
Retrying an unconfirmed outcome requires an explicit confirmation, and the job
keeps a bounded audit history with the previous error and dispatch marker before
opening a new lease.

Required GitHub Actions secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (optional fallback)

The service-role key must remain GitHub-only. OpenAI generation shares the same
OpenAI project hard budget as the web app, so keep that project budget at $5.
The Admin page shows the latest generation jobs. It can move a current-version
deferred, failed, or dead-letter job back to `pending`, or explicitly close an
obsolete-version pending/deferred/terminal row while preserving bounded audit
evidence. Execution resumes on the next scheduled or manually dispatched
workflow.

Rollback is non-destructive: disable the generation step in the workflow. DB
drafts, immutable revisions, jobs, and events remain available for audit, while
the existing DB reader continues serving already synchronized content.

## Multi-language Phase A foundation

`20260727100000_add_multilanguage_content_foundation.sql` adds language and track
metadata without rewriting immutable lesson or question revisions. Both values
are generated from the existing compatible `standard` column, whose constraint
is widened to include `python3`. Existing C++ rows therefore materialize as
`language = cpp` with their original track and checksum.

The current-lessons view appends `language` and `track`; existing columns retain
their names and order. Apply this migration before deploying the matching app
code. Phase A does not add Python lessons, change the selected practice deck, or
alter C++ question taxonomy, approvals, scheduling, and history.

## CMake Phase A foundation

`20260728100000_add_cmake_content_foundation.sql` widens the same compatibility
contract to `language = cmake`, `track = cmake`. Because PostgreSQL does not
allow changing a generated-column expression in place, the migration briefly
drops the current-lessons view and rebuilds only the derived `language`/`track`
columns before recreating the view. Immutable lesson revisions, source hashes,
questions, approvals, and learning history are not rewritten or deleted.

Apply it before deploying the matching app code. The migration is transactional;
an error rolls the whole change back. CMake discovery and the visible deck remain
disabled in this phase.

## C++14 content track

`20260829100000_add_cpp14_content_track.sql` widens the four current lesson
standard/track check constraints to accept `cpp14`. It adds and validates the
replacement checks before removing the old names, and does not change rows,
generated columns, views, RLS, grants, or RPCs.

Apply it before the first `content:sync` that contains the C++14 curriculum;
otherwise the existing database checks reject the new lesson revisions. The
migration does not publish or approve any lesson or question by itself.

## C++17 content track

`20260829130000_add_cpp17_content_track.sql` widens the same four checks to
accept `cpp17` while retaining `cpp14` and every existing compatibility value.
It uses validated replacement constraints and does not change data, views, RLS,
grants, or RPCs.

Apply `20260829100000_add_cpp14_content_track.sql` first, then this migration,
before the first `content:sync` containing the C++17 curriculum. Neither
migration publishes or approves lessons or questions by itself.

## Isolated mock-interview code runner

`20260729100000_create_code_execution_admission.sql` adds the atomic admission,
idempotency, concurrency, and daily-quota layer for sample and hidden code
execution. Apply it before enabling the runner. The RPCs are service-role-only;
the browser cannot reserve, complete, or forge an execution result.

Create a dedicated Supabase secret API key named `code_runner` and add it to
Vercel as `CODE_RUNNER_SUPABASE_SECRET_KEY` for Production and Preview. Do not
reuse the GitHub content-sync key, do not prefix it with `NEXT_PUBLIC_`, and do
not expose it to client code. The web process uses it only for the two admission
RPCs; the sandbox receives a fixed allowlisted environment with none of the app
secrets.

Create the immutable Vercel Sandbox toolchain snapshot from the linked project:

```powershell
vercel link
vercel env pull .env.local
npm.cmd run sandbox:snapshot
```

The bootstrap VM may access the network only while installing GCC, CMake, Ninja,
Python, and `prlimit`. The saved snapshot and every candidate VM use deny-all
network policy. Copy the printed snapshot ID to Vercel, then set:

- `CODE_RUNNER_ENABLED=true`
- `CODE_RUNNER_SNAPSHOT_ID=<printed immutable snapshot ID>`
- `CODE_RUNNER_TOOLCHAIN_LABEL=Recall sandbox v1`
- `CODE_RUNNER_SUPABASE_SECRET_KEY=<dedicated secret API key>`

Redeploy after all four values exist. Each run uses a fresh non-persistent
Firecracker microVM, an unprivileged candidate user, fixed server-owned commands,
resource/output limits, and no ports or egress. Sample runs return compiler
diagnostics. Hidden runs return only status and pass counts; their source,
inputs, diagnostics, and output are neither sent to the browser nor stored in
the admission cache.

Initial per-user limits are 20 sample jobs and 12 hidden-report jobs per Vietnam
calendar day, with one active execution batch per user. Idempotency fingerprints
bind cached results to the exact question, execution-spec revision, and source
hash. Infrastructure failures are recorded as `sandbox_error` and must never
reduce the candidate score.

## Account-scoped Mock v4 history

`20260730100000_create_mock_interview_attempts.sql` must be applied after the
code-execution admission migration. It stores only candidate-visible attempt
metadata and normalized completed artifacts; candidate answers, rubrics,
canonical answers, hidden inputs, diagnostics, and output are rejected.

Create another dedicated Supabase secret API key named `mock_history` and add it
to the web runtime as `MOCK_HISTORY_SUPABASE_SECRET_KEY`. Do not reuse
`CODE_RUNNER_SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, and never use a
`NEXT_PUBLIC_` prefix.

The report route reserves history before hidden execution or paid AI. A frozen
submission and idempotency key can recover a cached completed report after a
lost response. Apply
`20260730170000_terminalize_mock_report_outcomes.sql` with the route: it adds a
provider dispatch marker, deletes an expired undispatched reservation so it can
be retried, and changes an expired dispatched reservation to terminal `failed`.
Ambiguous provider/completion outcomes and post-provider report-processing
failures are never renewed for another paid call.
Hidden terminal failures token-abort the unfinished history row before the
client rotates its downstream execution key. Browser deletion is owner-only and
cannot delete a live reservation. Until the migrations and dedicated secret
exist, starting a new Mock v4 session is intentionally disabled.

## Mistake → flashcard queue

Apply `20260730110000_create_mistake_flashcard_queue.sql` after the Mock v4
history migration. It adds owner-private candidates/observations/preferences,
coach idempotency, generation leases, grounding/resolution RPCs, and the
`mistake` DB-native question origin.

No new secret is required. Capture uses the authenticated owner session and RLS;
generation uses the existing OpenAI daily/monthly budget with Gemini fallback.
Cards are inserted as immutable DB-native `draft` revisions and remain inactive
until the owner approves their exact question version and source hash.
For Coach-originated mistakes, the browser keeps the `coachAttemptId` on the
exact pending local review until the sync route explicitly acknowledges capture
or discards it against the authoritative rating. An older concurrent sync
response cannot clear that marker.

Apply `20260730140000_harden_mistake_generation_retries.sql` with generation
code. Retry protocol v3 marks the exact lease immediately before each provider.
An expired undispatched lease is reclaimed; an expired dispatched lease becomes
`dead_letter`. Completion retries only the same draft, and a database trigger
rejects materialization before the dispatch marker exists.

For this hardening set, deploy the new app and generation workflow first, then
apply `20260730130000`–`20260730170000` and
`20260730190000`–`20260730220000` in timestamp order. In particular, never
apply protocol-breaking `20260730140000`, `20260730170000`, or
`20260730210000` while an older app or generation worker can still run. The new
code preflights each AI protocol and fails closed before a provider call while
its migration is absent. Practice history uses a two-stage rollout:
`20260730200000` temporarily keeps the five-argument review RPC, and
`20260730220000` may backfill generations and remove that overload only after
the generation-aware app is serving requests.

## Blank and long AI-coach answers

Apply `20260730120000_allow_blank_unbounded_coach_answers.sql` after the mistake
queue migration. It removes the old 10–6,000 character check from
`coach_attempts.candidate_answer` while retaining `NOT NULL`: an empty string
means the learner does not know, and PostgreSQL `text` stores longer answers
without a product-level cap. Deploy it with the matching coach UI/API change so
blank or long attempts keep their idempotent history instead of failing the
history insert.

## Coach request idempotency

Apply `20260730130000_create_coach_evaluation_reservations.sql` and
`20260730160000_create_coach_follow_up_reservations.sql`. Evaluation and
follow-up cache exact account/request fingerprints under canonical idempotency
keys. Each lease is marked immediately before a provider call: expired
undispatched work is removed for a safe retry, while dispatched ambiguous work
becomes terminal `outcome_unknown`.

For the bilingual Coach contract, also apply
`20260828110000_localize_coach_evaluation_fingerprints.sql`. It keeps the
evaluation fingerprint locale-bound, persists the inferred locale on
`coach_attempts`, and treats pre-localization fingerprints as Vietnamese only.
The function signatures remain unchanged, so this migration is compatible with
both sides of a rolling app deployment.

## Public AI Coach access

Apply `20260805100000_create_public_ai_quota_admission.sql` and
`20260805110000_create_public_ai_budget_ledger.sql`, followed by the two upgrade
migrations documented below, before setting `PUBLIC_AI_ENABLED=true`. Together
they open the Coach evaluation and follow-up routes to guests and non-admin
accounts through Luna only. They store HMAC
identity hashes only: never raw IP addresses, device tokens, account UUIDs,
prompts, answers, or model output.

Admission locks IP, device, and (when signed in) account windows in a
deterministic order and permits at most three live/dispatched turns per rolling
24 hours. The second migration separately reserves and finalizes site-wide
daily/monthly Luna cost before/after the provider call. Its aggregate ledger is
retained even after the short-lived admission reservations are purged. An
undispatched lease can be released safely; any dispatched ambiguous request is
conservatively charged and remains consumed.

Apply `20260809110000_refresh_public_ai_quota_rpc_contract.sql` after upgrading
an existing deployment. The application now always supplies all eight admission
arguments, including the lease duration; this migration reasserts the
service-role-only grant and reloads PostgREST's schema cache. It does not delete
or reset existing quota windows or reservations.

Then apply `20260809120000_add_public_ai_quota_status.sql`. It adds a read-only,
service-role-only status RPC and an admission v2 wrapper whose visible remaining
count is the minimum allowance across the active IP, device, and optional
account windows. This lets a new incognito profile recover the network quota
without browser fingerprinting and prevents a fresh device cookie from making
the UI look reset. Deploy the compatible app first; it falls back to the original
enforcing admission RPC only while this migration is absent.

Create a dedicated Supabase secret API key named `public_ai_quota` and add it
only to Vercel as `PUBLIC_AI_QUOTA_SUPABASE_SECRET_KEY`. Also create a random
server-only `PUBLIC_AI_QUOTA_IDENTITY_PEPPER`. Do not reuse the code-runner,
Mock history, or GitHub content-sync key, and do not enable `PUBLIC_AI_ENABLED`
until all listed migrations and the server routes have been deployed. Public traffic
must never use the owner's account-scoped AI budget or Gemini fallback.
