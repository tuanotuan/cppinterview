# C++ content source

cppinterview is a C++-only interview-practice site. The web content pipeline
discovers and serves lessons only from these repository roots:

- `cpp98_foundation/<lesson>/knowledge.md` or `vi.md`
- `cpp11/<lesson>/knowledge.md` or `vi.md`
- `cpp14/<lesson>/knowledge.md` or `vi.md`
- `cpp17/<lesson>/knowledge.md` or `vi.md`
- `cpp20/<lesson>/knowledge.md` or `vi.md`
- `cpp23/<lesson>/knowledge.md` or `vi.md`
- `dailycppinterview/<lesson>/vi.md`

Each lesson must be registered in `lesson-registry.yaml`. A monolingual lesson
uses `knowledge.md`. A bilingual lesson uses canonical Vietnamese `vi.md` plus
a sibling `en.md`; when both `vi.md` and legacy `knowledge.md` exist, `vi.md` is
authoritative. The content pipeline validates matching section topology and
generates an exact-revision English overlay. A sibling `main.cpp` is optional
and is shown as supporting source material when present.

## Adding a lesson

1. Add or revise the C++ note and update `lesson-registry.yaml`.
2. From `web/`, run `npm run content:discover`.
3. Commit `src/generated/content-manifest.json` and
   `src/generated/lesson-translations-en.json` together with the note and
   registry change.
4. Push to `main`. The content sync imports the lesson and sends any AI
   drafts to the admin review queue; drafts are never published automatically.

The root `python/` directory is intentionally outside this pipeline. It is
kept in the repository as personal study material and is neither discovered,
synced, nor displayed by the web product.

## Real-World C++ Interviews

`dailycppinterview/` is a version-neutral C++ collection and deliberately has no
roadmap. Its authored catalog is `daily-cpp-interview-source.json`; the catalog
records provenance and permission separately for the original 146 prompts and
the repository-owner-curated 30-prompt expansion. Run
`node scripts/generate-daily-cpp-interview.mjs` from `web/` to regenerate the
lesson directories, lesson registry entries, question YAML, and English
question overlay. Do not edit generated collection files instead of the
catalog/generator.

`npm run content:generate` also derives
`real-world-cpp-interview-questions.json` from that catalog. The index contains
only the stable lesson ID and canonical English prompt, with no answers or
lesson copy. Search it before adding a batch and never edit it manually. The
collection generator normalizes Unicode, letter case, whitespace, quotation
marks, and trailing question punctuation before checking duplicates; an exact
intentional repetition must still declare `repeatOf`.

Every collection lesson contains exactly `vi.md`, `en.md`, and `main.cpp`, with
one self-check and one stable question ID. All generated question revisions are
immutable: a real content change requires a new question version, while a rename
must be handled at the display layer. The legacy `Daily C++ Interview` label is
retained only in Q001-Q146 because it participates in those v1 source hashes;
later batches use their own declared source label. Every future batch must add a
non-overlapping range with separate provenance and reuse permission before its
prompts are imported.

## Roadmaps

Roadmaps are navigation metadata, not published lessons. The C++11, C++14,
C++17, C++20, and C++23 paths live in `roadmaps/cpp11.yaml`,
`roadmaps/cpp14.yaml`, `roadmaps/cpp17.yaml`, `roadmaps/cpp20.yaml`, and
`roadmaps/cpp23.yaml`; each owns its
bilingual phase/day titles, objectives, prerequisite-day graph,
content-coverage status, and links to existing lesson IDs. A `planned` day must
not link a lesson. `ready` and `partial` days may only link lessons that already
exist in `lesson-registry.yaml` under the roadmap's track.

Do not add placeholder lessons or fake `knowledge.md` files to make a roadmap
node look available. Add the real lesson source first, refresh the content
manifest, then update that node's links and coverage in the roadmap registry.
