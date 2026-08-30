# Day 27 — Modules, Header Units, and Header Migration

## 1. Problem It Solves

Header units let supported toolchains import legacy headers as compiled units, while gradual migration keeps old and new consumers working. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Module units and traditional `#include` from Day 26.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A header unit is a bridge: the old header crosses mostly unchanged, but the importer consumes a compiled representation instead of pasting text. Read `import <header>` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
import <vector>; // after the toolchain builds the header unit
```

## 5. How It Works

1. The program introduces the smallest relevant form of `import <header>`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Macros and include-order assumptions do not cross module boundaries like ordinary declarations; compiler support and build commands also differ.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when the build system explicitly supports header units and a measured migration reduces repeated parsing.
- Avoid it when portable build support or macro-dependent legacy behavior is not yet under control.

## 8. Simple Example

The runnable file prints a traditional include, a header-unit import, and a named-module migration sketch as separate fragments. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `import <header>` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `import <header>` in the minimal example?
2. Medium — What textual action performed by `#include` is avoided by a successfully built header unit?
3. Hard — Why can replacing every include with import mechanically change observable macro behavior even when declarations appear identical?
