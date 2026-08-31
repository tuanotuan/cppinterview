# Day 2 — CMake C++23, Feature-Test Macros, and Compiler Matrices

## 1. Problem It Solves

Projects need one repeatable way to request C++23 and a separate way to test individual facilities. CMake expresses the build requirement; feature-test macros describe the code capability. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: compiler identity, standard mode, and incomplete feature support.

## 3. Core Idea

CMake chooses the lane, while feature-test macros inspect the equipment in the vehicle. A compiler matrix repeats that check across vendors and versions. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
#include <version>
#if defined(__cpp_lib_expected)
#endif
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for CMake C++23, Feature-Test Macros, and Compiler Matrices.
1. It reports selected language and library macros after the build requests C++23. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the exact feature values supplied by this libstdc++ installation, making the important behavior easy to verify.

## 6. Common Mistakes

- Using only `CXX_STANDARD 23` without checking a new library component confuses requested mode with implemented support.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves a multi-platform repository or any lesson that may run on several compiler versions.
- Avoid it when the task involves scattering vendor-number checks through code when a standardized feature macro exists.

## 8. Simple Example

A project enables an optional `std::expected` path only when `__cpp_lib_expected` has a sufficient value. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — If CMake requests C++23 but `__cpp_lib_print` is absent, which fact should control a call to `std::print`, and why?
