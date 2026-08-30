# Day 3 — Templates, Type Traits, SFINAE, and if constexpr

## 1. Problem It Solves

Generic code must adapt to several types while rejecting operations that do not make sense for a particular type. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Functions, templates, and basic types.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A template is a blueprint, a type trait is a compile-time fact, SFINAE removes invalid candidates, and `if constexpr` discards the unused branch. Read `if constexpr` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
if constexpr (std::is_integral_v<T>) { /* integral path */ }
```

## 5. How It Works

1. The program introduces the smallest relevant form of `if constexpr`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Using an ordinary `if` does not prevent both branches from being type-checked, so an invalid operation in the unused branch can still fail compilation.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when one algorithm has a genuinely shared structure but needs small type-dependent choices.
- Avoid it when unrelated behaviors would be clearer as separate ordinary functions.

## 8. Simple Example

The example classifies an integer and a floating-point value at compile time and prints different descriptions. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `if constexpr` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `if constexpr` in the minimal example?
2. Medium — Which branch of `describe(3.5)` is instantiated, and what happens to the other branch?
3. Hard — Why does substitution failure remove an overload instead of making the whole program ill-formed, while an error in the selected function body does not?
