# Day 35 — `std::print` and `std::println`

## 1. Problem It Solves

Stream insertion can be verbose and separates format from values. C++23 `std::print` writes formatted text directly, while `std::println` adds a final newline. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: library feature availability.
- Strings, streams, and basic formatting fields.

## 3. Core Idea

The format string is a template with numbered-in-order holes. Arguments fill the holes under type-aware formatting rules, then the result goes directly to the chosen output stream. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::println("score = {}", score);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::print` and `std::println`.
1. It uses `std::println` when the library supplies it and an equivalent stream fallback otherwise. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the fixed score on one complete line, making the important behavior easy to verify.

## 6. Common Mistakes

- A runtime format string requires the correct runtime-format facility; mismatching fields and arguments can be diagnosed at compile time for literal format strings.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves clear user-facing output, logs, and diagnostics with compact typed formatting.
- Avoid it when the task involves binary output or highly customized stream state already expressed clearly with existing stream code.

## 8. Simple Example

A command prints `processed 12 records` with one format string and one integer argument. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why can a literal format string reject a bad argument type during compilation while a dynamically constructed format string needs a different checking path?
