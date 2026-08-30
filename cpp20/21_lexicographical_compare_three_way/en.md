# Day 21 — lexicographical_compare_three_way

## 1. Problem It Solves

This algorithm compares two sequences element by element and returns a comparison category rather than only a less-than Boolean. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Iterators, ranges, and comparison categories.
- You should be able to compile a short program and read its output.

## 3. Core Idea

It works like dictionary order: find the first differing pair; if none differs, the shorter sequence comes first, otherwise they are equal. Read `std::lexicographical_compare_three_way` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
auto order = std::lexicographical_compare_three_way(a.begin(), a.end(), b.begin(), b.end());
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::lexicographical_compare_three_way`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Passing mismatched or invalid iterator pairs is undefined behavior, and a custom comparator must return an appropriate comparison category.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when two sequences need one category result that distinguishes less, equal, and greater.
- Avoid it when a simple equality check or ordinary lexicographical less-than result is all the caller needs.

## 8. Simple Example

Two arrays differ at their final element, and the algorithm reports that the first sequence is smaller. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::lexicographical_compare_three_way` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::lexicographical_compare_three_way` in the minimal example?
2. Medium — Which element pair determines the result for `{1,2,3}` and `{1,2,4}`?
3. Hard — If every shared prefix element is equivalent, how does sequence length determine the category result?
