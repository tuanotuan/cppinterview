# Day 32 — `std::out_ptr` and `std::inout_ptr`

## 1. Problem It Solves

C APIs often return ownership through `T**`, which does not directly match a C++ smart pointer. `std::out_ptr` and `std::inout_ptr` adapt that output parameter while restoring RAII ownership afterward. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 3: ownership transfer.
- Day 6: RAII and resource lifetime.

## 3. Core Idea

The adapter temporarily opens a controlled raw-pointer doorway. `out_ptr` expects fresh output; `inout_ptr` also exposes an existing pointer that the C function may replace. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
legacy_create(std::out_ptr(owner));
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::out_ptr` and `std::inout_ptr`.
1. It lets tiny C-style create and replace functions populate a `std::unique_ptr` when supported. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the value owned by the smart pointer after adaptation, making the important behavior easy to verify.

## 6. Common Mistakes

- Using `inout_ptr` with an API that neither releases nor replaces the old pointer can leak or double-delete; a custom deleter must match the C allocation function.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves interfacing an owning smart pointer with a well-documented legacy C output parameter.
- Avoid it when the task involves new C++ APIs, which should return RAII owners directly rather than expose `T**`.

## 8. Simple Example

A legacy image loader writes a newly allocated handle through `Handle**`, while C++ stores the result in a unique owner. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why is `out_ptr` appropriate for an empty owner but `inout_ptr` requires a precise contract for what the C function does with the old pointer?
