# Day 1 — Toolchain, Compiler Flags, and C++20 Mode

## 1. Problem It Solves

A toolchain turns source text into an executable, while compiler flags select the language rules, diagnostics, and output file. It makes an important assumption visible and checkable.

## 2. Prerequisites

- A source file with a `main` function.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Picture a pipeline: source is translated, checked under C++20 rules, linked, and then executed. A flag is an instruction attached to that pipeline. Read `-std=c++20` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
// g++ -std=c++20 -Wall -Wextra -Wpedantic main.cpp -o main
#if __cplusplus >= 202002L
// C++20 mode is active.
#endif
```

## 5. How It Works

1. The program introduces the smallest relevant form of `-std=c++20`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Compiling without `-std=c++20` can reject valid C++20 syntax or silently select an older language mode; ignoring warnings can hide real defects.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when you compile a lesson, test a feature, or want reproducible diagnostics.
- Avoid it when you are merely running an executable that has already been built.

## 8. Simple Example

The program prints `__cplusplus` and confirms whether the compiler selected C++20 or later. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `-std=c++20` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `-std=c++20` in the minimal example?
2. Medium — If `__cplusplus` prints a value below `202002`, which part of the build command should you inspect?
3. Hard — Why can the same source compile differently when only `-std=c++20` is removed, even though the compiler executable is unchanged?
