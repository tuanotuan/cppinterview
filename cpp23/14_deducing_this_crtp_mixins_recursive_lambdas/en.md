# Day 14 — Deducing `this` with CRTP, Mixins, and Recursive Lambdas

## 1. Problem It Solves

Deducing `this` can replace some CRTP boilerplate and lets a lambda name its own callable object without an external `std::function`. Recursion becomes local and allocation-free. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 4: CRTP and generic programming.
- Days 11–13: deduced object parameters and constraints.

## 3. Core Idea

The callable passes itself through the object slot. Each recursive call reuses that self object, much like a named function but without creating a separate declaration. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
auto fact = [](this auto self, int n) { return n < 2 ? 1 : n * self(n - 1); };
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Deducing `this` with CRTP, Mixins, and Recursive Lambdas.
1. It uses an explicit self parameter to compute a small factorial recursively. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the expected factorial or a precise unsupported-feature message, making the important behavior easy to verify.

## 6. Common Mistakes

- Capturing the recursive lambda by reference during its own initialization is invalid; careless recursion can still overflow the call stack.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves small local recursive algorithms and mixins where explicit-object syntax removes repeated CRTP casts.
- Avoid it when the task involves deep recursion or cases where a named function communicates intent more clearly.

## 8. Simple Example

A local tree-depth calculation uses a recursive lambda without type erasure or heap allocation. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why does `this auto self` usually copy the closure object, and when would `this auto&& self` change behavior or efficiency?
