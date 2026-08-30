# Day 17 — is_constant_evaluated and the constexpr Standard Library

## 1. Problem It Solves

Code sometimes needs one implementation path during constant evaluation and another at runtime, while still presenting one function interface. It makes an important assumption visible and checkable.

## 2. Prerequisites

- constexpr functions, arrays, and compile-time assertions.
- You should be able to compile a short program and read its output.

## 3. Core Idea

`std::is_constant_evaluated()` is a sensor inside a `constexpr` function. It reports which evaluation world the current call inhabits. Read `std::is_constant_evaluated` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
if (std::is_constant_evaluated()) { return value + 1; }
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::is_constant_evaluated`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Testing it in a context that is itself manifestly constant-evaluated can produce a predictably true result and may surprise code written as a runtime probe.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a constexpr-capable algorithm needs a legal compile-time path and an optimized or instrumented runtime path.
- Avoid it when both contexts can use the same simple implementation.

## 8. Simple Example

One function returns different offsets in constant and runtime evaluation, and a constexpr `std::array` verifies the compile-time result. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::is_constant_evaluated` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::is_constant_evaluated` in the minimal example?
2. Medium — Why do the `static_assert` value and the runtime printed value differ for the same numeric argument?
3. Hard — Why should `std::is_constant_evaluated()` usually be called directly in the branch condition instead of cached in a misleading context?
