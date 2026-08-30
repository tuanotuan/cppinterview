# Day 5 — Iterators, Algorithms, string_view, and PMR

## 1. Problem It Solves

The standard library separates storage, traversal, algorithms, text views, and allocation policy so each concern can be reused. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Containers, strings, loops, and basic algorithms.
- You should be able to compile a short program and read its output.

## 3. Core Idea

A container owns elements, iterators mark positions, an algorithm works between positions, `string_view` borrows text, and PMR chooses where dynamic storage comes from. Read `std::pmr` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
std::pmr::vector<std::pmr::string> words{&resource};
std::sort(words.begin(), words.end());
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::pmr`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Iterators and views may dangle after their source changes or dies; a PMR container must not outlive its memory resource.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when you want standard algorithms with explicit non-owning inputs or controlled temporary allocation.
- Avoid it when ordinary containers and owning strings already express the lifetime and performance needs clearly.

## 8. Simple Example

The example stores PMR strings in a local buffer, sorts them through iterators, and prints each through `string_view`. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::pmr` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::pmr` in the minimal example?
2. Medium — Why does sorting the container also change the order observed through newly created iterators?
3. Hard — Which object must outlive the PMR vector, and why is moving the vector elsewhere not automatically enough to extend that lifetime?
