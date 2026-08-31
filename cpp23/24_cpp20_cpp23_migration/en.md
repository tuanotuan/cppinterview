# Day 24 — Deprecations, Compatibility, and C++20–C++23 Migration

## 1. Problem It Solves

Migration is not a flag flip. Teams must identify removed or deprecated facilities, check implementation support, keep behavior stable, and introduce replacements in reviewable steps. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Days 1–2: support matrices and feature-test macros.
- Days 7–23: the language changes being migrated.

## 3. Core Idea

Treat migration as crossing a bridge with checkpoints: clean C++20 warnings, enable C++23, inspect feature availability, replace risky APIs, then test each supported compiler. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
[[deprecated("use new_api")]] int old_api();
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Deprecations, Compatibility, and C++20–C++23 Migration.
1. It keeps a deprecated wrapper visible while the running path calls its replacement. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the same result through the current API with a warning-free build, making the important behavior easy to verify.

## 6. Common Mistakes

- Changing language mode and every library idiom at once makes regressions difficult to isolate; suppressing deprecation warnings leaves technical debt hidden.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves planned upgrades with tests, compiler matrices, and small compatibility layers.
- Avoid it when the task involves rewriting stable code solely to use every new feature or removing fallbacks before supported compilers catch up.

## 8. Simple Example

A project keeps `old_total()` deprecated for one release while all internal calls move to `new_total()`. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — How can a compatibility wrapper remain source-compatible without silently changing overload resolution or ownership behavior?
