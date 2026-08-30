# Day 15 — consteval, constexpr, and Immediate Functions

## 1. Problem It Solves

`constexpr` permits compile-time evaluation when inputs allow it, while `consteval` requires every potentially evaluated call to happen at compile time. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Functions, constant expressions, and compile-time evaluation.
- You should be able to compile a short program and read its output.

## 3. Core Idea

`constexpr` is an express lane that may also serve runtime traffic; `consteval` is a gate that admits compile-time traffic only. Read `consteval` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
consteval int checked(int value) { return value >= 0 ? value : throw 0; }
```

## 5. How It Works

1. The program introduces the smallest relevant form of `consteval`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Passing a runtime value to an immediate function is a compile error, and a `constexpr` function is not guaranteed to run during compilation unless its context requires it.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when invalid configuration or generated data must be rejected before the program can run.
- Avoid it when the input is inherently available only at runtime.

## 8. Simple Example

The example uses a flexible `constexpr` square and a mandatory compile-time `consteval` checked value. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `consteval` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `consteval` in the minimal example?
2. Medium — Which call is forced to execute during translation, and which function could also be called with a runtime variable?
3. Hard — Why does storing a `constexpr` function result in an ordinary non-const variable not by itself prove that evaluation happened at compile time?
