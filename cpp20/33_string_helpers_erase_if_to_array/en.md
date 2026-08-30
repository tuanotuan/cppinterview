# Day 33 — starts_with, ends_with, contains, erase_if, and to_array

## 1. Problem It Solves

C++20 adds concise library operations for prefix/suffix checks, associative membership, predicate erasure, and creating `std::array` from a built-in array literal. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Strings, associative containers, arrays, and predicates.
- You should be able to compile a short program and read its output.

## 3. Core Idea

These are named intentions: ask text about its edges, ask a set about membership, erase matching elements, and preserve array size in the type. Read `std::erase_if` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
bool prefix = text.starts_with("log:");
std::erase_if(values, predicate);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::erase_if`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- `contains` is C++20 for associative containers, not `std::string::contains`; string `contains` arrives later, so version boundaries matter.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when the named operation exactly matches the intent and improves readability.
- Avoid it when you target an older standard library or need a different matching/erasure policy.

## 8. Simple Example

The program checks a string, queries a set, removes even vector elements, and creates a fixed array. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::erase_if` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::erase_if` in the minimal example?
2. Medium — After `std::erase_if` removes even values, which values remain and in what order?
3. Hard — Why would replacing `set.contains(key)` with `text.contains(fragment)` violate this course’s C++20 boundary?
