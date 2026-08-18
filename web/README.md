# cppinterview web

This Next.js application turns the repository's C++ notes into flashcards,
practice questions, code exercises, and WorldQuant-style mock interviews.

The content pipeline is C++-only and reads `cpp98_foundation/`, `cpp11/`,
and `cpp20/`. The repository's `python/` directory remains untouched but
is not part of the web product.

Before finishing a web change, run:

```powershell
npm.cmd run content:refresh
npm.cmd run context:check
npm.cmd run build
```
