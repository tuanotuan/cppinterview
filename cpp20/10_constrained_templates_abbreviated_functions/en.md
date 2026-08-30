# Day 10 — Constrained Templates and Abbreviated Function Templates

## 1. Problem It Solves

Constraints keep invalid template arguments out of an interface, and abbreviated syntax removes boilerplate for simple constrained parameters. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Standard concepts and ordinary function templates.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A constrained template is a normal template with a gate. Writing `Concept auto` places that gate directly beside the function parameter. Read `Concept auto` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::integral auto square(std::integral auto value);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `Concept auto`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Different constraint placements can look equivalent yet participate differently in overload ordering when their constraint expressions are not structurally related.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a function is generic but each parameter has a clear concept-level contract.
- Avoid it when you need to name or relate several template parameters in a more explicit declaration.

## 8. Simple Example

The program defines one named constrained template and one abbreviated function, both restricted to integers. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `Concept auto` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `Concept auto` in the minimal example?
2. Medium — What template parameter does the compiler invent for `std::integral auto value`?
3. Hard — When two parameters must have exactly the same type, why may two separate `std::integral auto` parameters be too weak?
