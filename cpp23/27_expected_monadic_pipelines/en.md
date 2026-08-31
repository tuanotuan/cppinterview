# Day 27 — Monadic Operations and Error Pipelines with `std::expected`

## 1. Problem It Solves

Several fallible steps otherwise require repeated checks and early returns. C++23 monadic operations connect them while preserving the first error and skipping later success work. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 25: `optional` monadic vocabulary.
- Day 26: success and error alternatives in `expected`.

## 3. Core Idea

Imagine a railway switch. `and_then` continues on the success rail, `transform` changes the carried value, and `or_else` can inspect or replace the error rail. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
read().and_then(parse).transform(normalize).or_else(report);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Monadic Operations and Error Pipelines with `std::expected`.
1. It chains two fallible integer steps when monadic `expected` support is present. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the final transformed value or a truthful library-support message, making the important behavior easy to verify.

## 6. Common Mistakes

- Mismatched error types stop composition, and using `transform` for a function that already returns `expected` produces an unwanted nested `expected`.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves linear validation or conversion pipelines whose steps share a coherent error model.
- Avoid it when the task involves business logic with branching recovery that is clearer through explicit statements.

## 8. Simple Example

A request pipeline decodes a number, validates it, and converts it to a display string while preserving the first failure message. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why does `transform(f)` yield `expected<expected<U, E>, E>` when `f` returns `expected<U, E>`, and which operation avoids that nesting?
