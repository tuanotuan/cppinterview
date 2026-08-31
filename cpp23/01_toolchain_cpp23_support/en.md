# Day 1 — Toolchains and C++23 Support

## 1. Problem It Solves

A language standard is a specification, while GCC, Clang, and MSVC are implementations. This lesson shows how to select C++23 mode and verify what the active compiler actually provides. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Basic command-line use and a minimal C++ program.

## 3. Core Idea

Think of C++23 as a checklist. A toolchain may check many boxes but still leave some language or library boxes empty. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
static_assert(__cplusplus > 202002L);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Toolchains and C++23 Support.
1. It prints the standard-mode value and identifies the active compiler through predefined macros. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a visible C++23 mode number and the GCC version, making the important behavior easy to verify.

## 6. Common Mistakes

- Treating `-std=c++23` as proof of complete support can make code fail on another standard-library version.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves starting a project, reporting a compiler bug, or building a portability matrix.
- Avoid it when the task involves hard-coding a vendor version when a feature-test macro can test the exact facility.

## 8. Simple Example

A CI job records `__cplusplus` and vendor macros next to every build result. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why can two GCC installations accept `-std=c++23` yet expose different C++23 library facilities?
