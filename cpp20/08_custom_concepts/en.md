# Day 8 — Defining Custom Concepts

## 1. Problem It Solves

A custom concept gives a meaningful name to a reusable compile-time contract for template arguments. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Requires expressions and templates from Day 7.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A concept is a named gate: a type passes when the Boolean constraint is true, and code behind the gate may rely on that stated contract. Read `concept` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
template<class T>
concept Addable = requires(T a, T b) { { a + b } -> std::same_as<T>; };
```

## 5. How It Works

1. The program introduces the smallest relevant form of `concept`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A concept that checks incidental syntax instead of real semantic needs can accept misleading types or make an API needlessly restrictive.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when the same domain rule constrains several templates and deserves a readable name.
- Avoid it when the condition is used once and a short standard concept already says exactly the same thing.

## 8. Simple Example

The `Addable` concept accepts values whose addition returns the same type and constrains a small `twice` function. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `concept` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `concept` in the minimal example?
2. Medium — Why does the concept reject a type whose `operator+` returns an unrelated proxy type?
3. Hard — How can a syntactically valid `a + b` still fail to satisfy the intended meaning of “addable,” and what does that teach about concept design?
