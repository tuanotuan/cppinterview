# Day 10 — Simpler Implicit Move

## 1. Problem It Solves

Returning a local or by-value parameter should normally transfer its resources. C++23 simplifies overload resolution by treating eligible return operands as rvalues without the older two-stage fallback model. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 3: move semantics and object lifetime.
- Day 9: prvalues and value-producing expressions.

## 3. Core Idea

At a return boundary, an eligible local is leaving the function anyway. The language gives move-aware overloads first-class treatment without requiring `std::move` in ordinary returns. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::unique_ptr<int> pass(std::unique_ptr<int> p) { return p; }
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Simpler Implicit Move.
1. It returns a move-only parameter without an explicit `std::move`. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the caller receives the same owned integer with no copy operation, making the important behavior easy to verify.

## 6. Common Mistakes

- Writing `return std::move(local);` can inhibit named return value optimization; assuming implicit move applies to arbitrary globals or referenced objects is also wrong.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves returning local values and by-value parameters, especially move-only types.
- Avoid it when the task involves forcing a move from data not owned by the function or decorating every return with `std::move`.

## 8. Simple Example

A factory returns a `std::unique_ptr` result directly, leaving ownership transfer obvious and safe. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why is a local variable eligible for implicit move while a global object named in the same return statement is not?
