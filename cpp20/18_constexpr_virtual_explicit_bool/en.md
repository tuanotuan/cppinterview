# Day 18 — constexpr Virtual Functions and explicit(bool)

## 1. Problem It Solves

C++20 extends compile-time object-oriented evaluation and lets a constructor become explicit or implicit from a constant Boolean condition. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Virtual functions, constructors, constexpr, and type traits.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A constexpr virtual call can dispatch while the concrete object is known during constant evaluation; `explicit(bool)` is a compile-time switch on conversion policy. Read `explicit(bool)` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
explicit(!std::is_convertible_v<T, int>) constexpr Box(T value);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `explicit(bool)`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Virtual dispatch cannot be constant-evaluated through an object whose dynamic type is not usable in that constant-expression context, and conditional implicit conversion can make APIs subtle.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when compile-time polymorphic objects are useful or constructor conversion safety genuinely depends on a type property.
- Avoid it when ordinary explicit constructors and non-virtual constexpr code are sufficient.

## 8. Simple Example

A derived constexpr virtual function is checked with `static_assert`, and a small box uses conditional explicitness. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `explicit(bool)` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `explicit(bool)` in the minimal example?
2. Medium — Which implementation supplies the value in the compile-time virtual call?
3. Hard — How can changing the template argument change whether copy-initialization is accepted even though the constructor declaration stays textually the same?
