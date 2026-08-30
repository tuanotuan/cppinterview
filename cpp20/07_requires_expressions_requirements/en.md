# Day 7 — Requires Expressions and Requirement Kinds

## 1. Problem It Solves

A requires expression asks whether a type supports specific syntax and properties before a template is selected. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Templates, expressions, and type traits from Day 3.
- You should be able to compile a short program and read its output.

## 3. Core Idea

It is a compile-time checklist. Simple, type, compound, and nested requirements inspect increasingly precise parts of the proposed type contract. Read `requires` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
requires(T a, T b) {
    typename T::value_type;
    { a + b } -> std::same_as<T>;
}
```

## 5. How It Works

1. The program introduces the smallest relevant form of `requires`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A requirement tests validity; it does not execute the expression and does not validate runtime values.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a template needs a structural contract that can be stated as valid types or expressions.
- Avoid it when the condition depends on runtime data rather than the type interface.

## 8. Simple Example

A concept checks for a nested `value_type`, an addition expression, its result type, and a size condition. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `requires` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `requires` in the minimal example?
2. Medium — Which requirement fails first for a type that has no nested `value_type` but does support `operator+`?
3. Hard — Why does `{ a + b } -> std::same_as<T>` test more than the simple requirement `a + b;`?
