# Day 21 — `[[assume]]` and `std::unreachable`

## 1. Problem It Solves

Optimizers can generate better code when an invariant is guaranteed but not provable. C++23 offers `[[assume(expr)]]` and `std::unreachable()` to communicate that certain states cannot occur. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: compiler optimization and implementation support.
- Conditions, undefined behavior, and attributes.

## 3. Core Idea

These are promises, not checks. If execution violates the promise, the program has undefined behavior and the optimizer may remove code you expected to protect you. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
if (bad_state) std::unreachable();
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `[[assume]]` and `std::unreachable`.
1. It computes a square only after expressing that the fixed input satisfies the invariant. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a deterministic positive result without entering the impossible path, making the important behavior easy to verify.

## 6. Common Mistakes

- Using either facility for unvalidated user input turns an ordinary error into undefined behavior; a debug assertion does not automatically replace a release-time proof.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves a truly guaranteed invariant at a low-level performance boundary after validation.
- Avoid it when the task involves recoverable errors, external input, or conditions that are merely likely rather than guaranteed.

## 8. Simple Example

After an exhaustive protocol-state switch, the default path is marked unreachable because earlier validation guarantees the enum value. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why can placing `[[assume(x != 0)]]` before validating `x` invalidate even code that appears to handle `x == 0` later?
