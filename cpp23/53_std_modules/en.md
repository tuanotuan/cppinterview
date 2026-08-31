# Day 53 — Standard Library Modules `std` and `std.compat`

## 1. Problem It Solves

C++23 standardizes named modules for the standard library. `import std;` exposes C++ library names, while `std.compat` also supports compatibility names traditionally associated with C headers. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: compiler-specific support and toolchains.
- Day 2: build-system configuration and feature matrices.

## 3. Core Idea

A header is text pasted into each translation unit; a module is a compiled interface imported by name. The source syntax is small, but building the module remains toolchain-specific. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
import std;
import std.compat;
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Standard Library Modules `std` and `std.compat`.
1. It keeps the real imports behind an explicit build switch and runs a header fallback on GCC 13. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a fixed standard-library result plus an honest note that module setup was not enabled, making the important behavior easy to verify.

## 6. Common Mistakes

- Treating modules as textual headers or compiling an import before the implementation has built the standard module produces missing-module errors; `std.compat` should not justify new reliance on global C names.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves supported toolchains where build-time experiments show a clear benefit and module artifacts are configured reproducibly.
- Avoid it when the task involves portable projects whose required compiler set cannot yet build the same standard-library modules.

## 8. Simple Example

A controlled build imports `std` instead of many standard headers while keeping a header path for unsupported CI jobs. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why can `import std;` be valid C++23 source yet fail in a correct C++23 compiler invocation that has not prepared the implementation's module artifact?
