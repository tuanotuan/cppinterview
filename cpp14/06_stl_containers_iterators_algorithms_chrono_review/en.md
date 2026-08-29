# Day 6 — Reviewing STL Containers, Iterators, Algorithms, and chrono

## 1. Problem It Solves

Programs repeatedly need collections, traversal, reusable operations, and type-safe time measurement. The standard library separates data storage, iterator ranges, algorithms, and clock durations so these pieces can be combined without rewriting loops.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 1-5; templates, lambdas, ranges expressed by `begin`/`end`, and basic output.

## 3. Core Idea

A container owns elements, iterators mark a half-open range, an algorithm operates on that range, and `std::chrono` represents time with explicit units.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::sort(values.begin(), values.end());
auto elapsed = end - start;
```

## 5. How It Works

1. A vector stores fixed sample values and exposes random-access iterators to its first and one-past-last positions.
2. The sorting algorithm rearranges the iterator range, while a steady clock measures the interval around that operation.
3. The values appear in ascending order and the duration check remains valid even when the measured count is zero.

## 6. Common Mistakes

- Passing iterators from different containers or using an invalidated iterator gives undefined behavior.
- Do not copy the pattern without checking container ownership, the exact half-open range, iterator validity, and the clock unit. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a standard container and algorithm already express the operation accurately and safely.
- Avoid it when a custom loop is required for unusual control flow that the chosen algorithm cannot express clearly.

## 8. Simple Example

A short score list is sorted with `std::sort`. `steady_clock` surrounds only the operation being observed, then the program prints sorted values and a simple valid-duration check.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- STL code becomes predictable when container, range, algorithm, and time unit are kept distinct.
- A container owns elements, iterators mark a half-open range, an algorithm operates on that range, and `std::chrono` represents time with explicit units.
- The compiler or library follows a precise rule; verify container ownership, the exact half-open range, iterator validity, and the clock unit.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Reviewing STL Containers, Iterators, Algorithms, and chrono?
2. Medium — Which elements belong to the range `[values.begin(), values.end())`, and why is the end iterator not dereferenced?
3. Hard — What could happen if an iterator saved before vector reallocation is passed to an algorithm afterward?
