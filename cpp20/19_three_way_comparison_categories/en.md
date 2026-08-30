# Day 19 — Three-Way Comparison and Comparison Categories

## 1. Problem It Solves

The three-way comparison produces one ordering result that can support several relational operators and preserve whether ordering is strong, weak, or partial. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Comparison operators, classes, and type deduction.
- You should be able to compile a short program and read its output.

## 3. Core Idea

Instead of asking six separate yes/no questions, `<=>` returns a comparison compass pointing below, equal, above, or unordered when the category permits it. Read `operator<=>` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto operator<=>(const Measurement&) const = default;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `operator<=>`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Floating-point members usually yield `std::partial_ordering` because NaN can be unordered; assuming strong ordering can break sorted-container expectations.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a type has a coherent ordering that should generate relational operations consistently.
- Avoid it when the domain has no meaningful total or partial order.

## 8. Simple Example

A measurement with a `double` member uses a defaulted spaceship operator and exposes its partial-ordering category. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `operator<=>` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `operator<=>` in the minimal example?
2. Medium — What Boolean result is printed when a measurement of `2.5` is compared with `3.0`?
3. Hard — Why does a defaulted comparison containing `double` not normally deduce `std::strong_ordering`?
