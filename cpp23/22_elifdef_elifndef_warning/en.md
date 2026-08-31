# Day 22 — `#elifdef`, `#elifndef`, and `#warning`

## 1. Problem It Solves

Preprocessor branches often test whether a macro exists. C++23 shortens common `#elif defined(...)` forms and standardizes `#warning` for an intentional diagnostic that does not stop translation. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: vendor macros and compiler selection.
- Day 2: feature-test macros and conditional compilation.

## 3. Core Idea

The preprocessor selects text before the compiler parses C++. `#elifdef X` asks whether the label exists; `#warning` leaves a visible caution for the selected configuration. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
#elifdef FEATURE_NAME
#elifndef OTHER_FEATURE
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `#elifdef`, `#elifndef`, and `#warning`.
1. It selects one constant with `#elifdef` while keeping a sample `#warning` in a disabled branch. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the value from the expected preprocessor branch with no build warnings, making the important behavior easy to verify.

## 6. Common Mistakes

- Confusing undefined with a macro defined as `0` changes branch logic; enabling permanent `#warning` lines can pollute clean builds and hide important diagnostics.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves portable configuration headers and temporary migration warnings tied to a specific branch.
- Avoid it when the task involves complex feature logic better expressed by generated configuration or C++ `if constexpr`.

## 8. Simple Example

A library selects a supported backend and warns when the fallback backend is compiled. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — If `FEATURE` is defined as `0`, how do `#elifdef FEATURE` and `#elif FEATURE` differ?
