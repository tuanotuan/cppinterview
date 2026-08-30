# Day 30 — Ranges Algorithms

## 1. Problem It Solves

Ranges algorithms accept whole ranges, integrate constraints, and often avoid repeating explicit begin/end pairs. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Algorithms, iterators, ranges, and projections.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The range is delivered as one package. The algorithm opens it through `begin` and `end`, while concepts reject incompatible packages early. Read `std::ranges::sort` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::ranges::sort(values);
auto it = std::ranges::find(values, 3);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::ranges::sort`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Returned iterators can still be invalidated by later container changes, and an algorithm may return `dangling` for an unsafe temporary range.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when a standard algorithm naturally operates on an entire range or benefits from a projection.
- Avoid it when only a deliberately selected iterator subrange should be processed.

## 8. Simple Example

A vector is sorted and searched using the range overloads with fixed data. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::ranges::sort` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::ranges::sort` in the minimal example?
2. Medium — After sorting `{4,1,3,2}`, where does `std::ranges::find(values, 3)` point?
3. Hard — Why may the return type change to `std::ranges::dangling` when the same algorithm receives a temporary non-borrowed range?
