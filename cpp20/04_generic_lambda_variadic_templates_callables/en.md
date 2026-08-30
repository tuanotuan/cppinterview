# Day 4 — Generic Lambdas, Variadic Templates, and Callables

## 1. Problem It Solves

Callables let algorithms accept behavior as data, while generic and variadic forms let one callable handle several types or argument counts. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Lambdas, templates, and function calls.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Treat a lambda as a tiny unnamed function object. Each `auto` parameter is deduced, and a parameter pack is a sealed bag expanded where `...` appears. Read `auto...` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto sum = [](auto... values) { return (values + ...); };
```

## 5. How It Works

1. The program introduces the smallest relevant form of `auto...`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A fold expression needs a valid operator and identity behavior; an empty pack can make some folds ill-formed.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a short operation belongs near its use and should work for several compatible inputs.
- Avoid it when the operation needs a stable public name, complex state, or extensive reuse.

## 8. Simple Example

A variadic generic lambda adds three fixed values and is passed to another function as a callable. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `auto...` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `auto...` in the minimal example?
2. Medium — What type and value are deduced for the result of adding `1`, `2.5`, and `3`?
3. Hard — Why can `(values + ...)` compile for one argument pack but fail for another even when both packs contain the same number of elements?
