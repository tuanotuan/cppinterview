# Repository instructions for AI agents

Read `AI_START_HERE.md` before making changes.

## Keep the AI handoff current

Every project change must leave the handoff consistent with the code:

1. From `web/`, run `npm run context:refresh` before finishing. Commit the
   resulting `docs/ai-context/GENERATED_SNAPSHOT.md` change with the code.
2. If architecture, a core data flow, an entry point, or module ownership
   changed, update `docs/ai-context/PROJECT_MAP.md`.
3. If commands, CI, environment variables, deployment, migrations, or a
   development invariant changed, update `docs/ai-context/DEVELOPMENT.md`.
4. If active work, a known blocker, an important limitation, or the latest
   validation result changed, replace the relevant text in
   `docs/ai-context/CURRENT_STATE.md`.
5. Update `AI_START_HERE.md` only when routing or these maintenance rules
   change.

`npm run context:check` is a required validation gate. It verifies the generated
snapshot against a fingerprint of project source, content, tooling, and schema
inputs. The generated snapshot is not a substitute for semantic documentation:
when behavior changes, update the appropriate human-maintained file too.

Do not put the current branch, HEAD commit, worktree status, timestamps, secrets,
or deployment assumptions in the generated snapshot. Those values are volatile;
inspect Git and external systems at runtime.

Keep handoff files concise. Replace stale facts instead of appending a changelog,
and link to source rather than copying implementation details.
