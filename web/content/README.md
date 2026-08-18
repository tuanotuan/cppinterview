# C++ content source

cppinterview is a C++-only interview-practice site. The web content pipeline
discovers and serves lessons only from these repository roots:

- `cpp98_foundation/<lesson>/knowledge.md`
- `cpp11/<lesson>/knowledge.md`
- `cpp20/<lesson>/knowledge.md`

Each lesson must be registered in `lesson-registry.yaml`. A sibling
`main.cpp` is optional and is shown as supporting source material when
present.

## Adding a lesson

1. Add or revise the C++ note and update `lesson-registry.yaml`.
2. From `web/`, run `npm run content:discover`.
3. Commit the generated `src/generated/content-manifest.json` together with
   the note and registry change.
4. Push to `main`. The content sync imports the lesson and sends any AI
   drafts to the admin review queue; drafts are never published automatically.

The root `python/` directory is intentionally outside this pipeline. It is
kept in the repository as personal study material and is neither discovered,
synced, nor displayed by the web product.
