# Day 20 — Defaulted Comparisons and Comparison Helpers

## 1. Problem It Solves

Defaulted comparison removes repetitive member-by-member code, while helper functions interpret category results without comparing them to arbitrary integers. It makes an important assumption visible and checkable.

## 2. Prerequisites

- The spaceship operator and comparison categories.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The compiler compares declared members in order. Helpers such as `std::is_lt` translate the category result into a clearly named Boolean question. Read `std::is_lt` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
bool operator==(const Point&) const = default;
auto operator<=>(const Point&) const = default;
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::is_lt`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Member order becomes comparison order, so rearranging fields can silently change sorting semantics; manually writing some operators may also conflict with generated ones.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when lexicographic member order matches the type’s intended equality and ordering.
- Avoid it when the domain order ignores fields or follows business rules different from declaration order.

## 8. Simple Example

Two points use defaulted equality and spaceship comparison, then `std::is_lt` reads the result. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::is_lt` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::is_lt` in the minimal example?
2. Medium — If the `x` members are equal, which member is compared next?
3. Hard — Why can adding a new data member change both equality and ordering without editing either defaulted operator?
