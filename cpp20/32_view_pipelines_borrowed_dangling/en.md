# Day 32 — View Pipelines, Borrowed Ranges, and Dangling Views

## 1. Problem It Solves

Pipelines compose lazy adaptors, while borrowed-range rules indicate when iterators may safely outlive the range object passed to an algorithm. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Views, ownership, lifetime, and range algorithms.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A pipeline connects lenses over one source. Borrowed status says whether destroying the lens holder also destroys the viewed elements. Read `std::ranges::borrowed_range` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto pipeline = values | std::views::filter(pred) | std::views::transform(map);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::ranges::borrowed_range`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Building a long-lived pipeline from a short-lived source or reference capture produces a dangling access even though construction itself succeeds.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when several lazy transformations should read left to right and the source lifetime is explicit.
- Avoid it when ownership must cross the pipeline boundary or lifetime is difficult to prove.

## 8. Simple Example

A named vector feeds a filter-transform pipeline, and static assertions contrast borrowed `span` with owning `vector`. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::ranges::borrowed_range` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::ranges::borrowed_range` in the minimal example?
2. Medium — Why is `std::span<int>` a borrowed range while `std::vector<int>` is not?
3. Hard — How does a named lvalue vector make the example safe even though the resulting view itself owns no elements?
