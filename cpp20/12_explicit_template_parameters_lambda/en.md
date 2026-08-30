# Day 12 — Explicit Template Parameter Lists for Lambdas

## 1. Problem It Solves

C++20 lets a lambda name its template parameters, making relationships between parameter types explicit without defining a separate function template. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Generic lambdas and template argument deduction.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The angle-bracket list is the lambda’s private template header. It exposes the deduced type so the parameter list can reuse or constrain it. Read `[]<class T>` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto maximum = []<class T>(T a, T b) { return a < b ? b : a; };
```

## 5. How It Works

1. The program introduces the smallest relevant form of `[]<class T>`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A single named `T` requires matching deductions; calls with two different argument types can fail even when an `auto, auto` lambda would accept them.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a local callable needs named template parameters, packs, or constraints.
- Avoid it when independent `auto` parameters already express the intended flexibility.

## 8. Simple Example

A lambda names `T`, accepts two values of that same type, and returns their larger value. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `[]<class T>` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `[]<class T>` in the minimal example?
2. Medium — Why does the call with two `int` values compile, and what type is returned?
3. Hard — What deduction conflict occurs for a call with `int` and `double` when both parameters are declared as `T`?
