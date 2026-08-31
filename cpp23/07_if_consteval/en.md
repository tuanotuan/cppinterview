# Day 7 — `if consteval` and `if !consteval`

## 1. Problem It Solves

One `constexpr` function sometimes needs different code during constant evaluation and runtime evaluation. C++23 provides a direct, readable test of that evaluation context. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 6: runtime execution versus stored coroutine state.
- Earlier knowledge of `constexpr` functions and ordinary `if`.

## 3. Core Idea

The compiler has two rooms: compile time and runtime. `if consteval` asks which room is currently evaluating this call, not whether the function was declared `constexpr`. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
if consteval { return compile_path; } else { return runtime_path; }
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `if consteval` and `if !consteval`.
1. It calls the same function once in a constant expression and once at runtime. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks two deliberately different values that reveal the selected branch, making the important behavior easy to verify.

## 6. Common Mistakes

- Replacing this with `std::is_constant_evaluated()` inside a normal `if` can make immediate-function calls ill-formed in cases where `if consteval` is designed to work.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves a shared API that needs a legal compile-time implementation and a different efficient runtime implementation.
- Avoid it when the task involves using it as a test for whether an argument is known at compile time outside constant evaluation.

## 8. Simple Example

A checksum function uses a simple compile-time path and a platform-optimized runtime path behind one interface. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — In a `constexpr` function called with a literal but assigned to a non-`constexpr` variable, which branch is selected and why?
