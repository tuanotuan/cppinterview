# cppinterview web

This Next.js application turns the repository's C++ notes into spaced-repetition
flashcards, practice questions, code exercises, and general C++ mock interviews.
The historical WorldQuant workspace remains a separate admin-only area.

The C++-only content pipeline reads `cpp98_foundation/`, `cpp11/`, `cpp14/`,
`cpp17/`, `cpp20/`, `cpp23/`, and the version-neutral
`dailycppinterview/` collection. The repository's `python/` directory remains
untouched and is not part of the web product.

Before finishing a web change, run:

```powershell
npm.cmd run content:refresh
npm.cmd run validate
```
