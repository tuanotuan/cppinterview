# Day 14 — Relaxed constexpr in C++14

## 1. Problem It Solves

C++11 `constexpr` function bodies were extremely restricted, often forcing recursive one-expression code. C++14 permits local variables, loops, branches, and mutation of local state while retaining compile-time evaluation when the arguments permit it.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 5 and 12: functions, loops, local variables, constant expressions, and compile-time assertions.

## 3. Core Idea

A C++14 `constexpr` function can look like ordinary imperative code. It becomes a compile-time calculation only when called in a constant-expression context with valid constant inputs.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) result *= i;
    return result;
}
```

## 5. How It Works

1. The function initializes a local accumulator and updates it through a bounded loop.
2. When used to initialize a `constexpr` variable, the compiler evaluates every loop iteration during translation.
3. `static_assert` verifies the factorial result before an executable is produced, and runtime only prints the stored constant.

## 6. Common Mistakes

- Marking a function `constexpr` does not guarantee every call is evaluated at compile time.
- Do not copy the pattern without checking constant inputs, allowed operations, loop termination, overflow, and the context requiring a constant expression. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a deterministic calculation benefits from compile-time validation and can also remain callable at runtime.
- Avoid it when the work depends on I/O, mutable global state, dynamic allocation, or values unavailable during translation.

## 8. Simple Example

An iterative factorial uses a local result and a `for` loop, both permitted by relaxed C++14 rules. A compile-time assertion checks `factorial(5)`.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Relaxed C++14 rules improve readability without changing the requirement that constant evaluation use valid operations.
- A C++14 `constexpr` function can look like ordinary imperative code. It becomes a compile-time calculation only when called in a constant-expression context with valid constant inputs.
- The compiler or library follows a precise rule; verify constant inputs, allowed operations, loop termination, overflow, and the context requiring a constant expression.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Relaxed constexpr in C++14?
2. Medium — Is `factorial(runtime_input)` still a valid call when the argument is not a compile-time constant?
3. Hard — Why can the same `constexpr` function execute at compile time in one context and at runtime in another?
