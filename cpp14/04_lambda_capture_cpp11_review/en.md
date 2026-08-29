# Day 4 — Reviewing Lambdas and Capture in C++11

## 1. Problem It Solves

Short behavior used once is awkward to place in a separate named function, especially when it needs nearby state. A lambda creates an unnamed callable and its capture list states which surrounding variables become part of that callable.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 1-3; local variables, references, function calls, and object lifetime.

## 3. Core Idea

A lambda is a tiny compiler-generated function object. Value capture stores a snapshot; reference capture stores access to the original object, so lifetime and mutation rules differ.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
int n = 3;
auto by_value = [n] { return n; };
auto by_ref = [&n] { ++n; };
```

## 5. How It Works

1. The capture list is read when the lambda object is created, not each time it is called.
2. A value member holds the old number, while the captured reference continues to refer to the original local variable.
3. Changing the original affects the reference-based lambda but not the value snapshot.

## 6. Common Mistakes

- Returning a lambda that captured a local variable by reference leaves a dangling reference after the local scope ends.
- Do not copy the pattern without checking capture mode, mutability, and whether every referenced object outlives the lambda call. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when an algorithm or local operation needs a small callable tied to nearby context.
- Avoid it when the body is large, reused broadly, or its captured lifetime cannot be made obvious.

## 8. Simple Example

A tax rate is captured by value to freeze the calculation rule, while a call counter is captured by reference so each invocation updates the same counter.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- The capture list is part of the lambda state and must communicate snapshot versus shared access.
- A lambda is a tiny compiler-generated function object. Value capture stores a snapshot; reference capture stores access to the original object, so lifetime and mutation rules differ.
- The compiler or library follows a precise rule; verify capture mode, mutability, and whether every referenced object outlives the lambda call.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Reviewing Lambdas and Capture in C++11?
2. Medium — If `rate` changes after a value-capturing lambda is created, which rate does that lambda use?
3. Hard — What becomes invalid when a lambda with `[&local]` escapes the scope that owns `local`?
