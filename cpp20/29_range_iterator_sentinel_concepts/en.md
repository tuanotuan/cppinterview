# Day 29 — Range, Iterator, and Sentinel Concepts

## 1. Problem It Solves

C++20 concepts describe what traversal operations a range provides, including an end sentinel that need not have the iterator’s type. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Iterators, concepts, and begin/end traversal.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The iterator is a cursor; the sentinel is a stop sign. They only need a valid comparison relationship, not identical representations. Read `std::sentinel_for` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
static_assert(std::sentinel_for<Sentinel, Iterator>);
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::sentinel_for`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- Assuming random access or identical iterator/end types rejects useful ranges and can select operations the traversal category does not support.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when generic code must state the weakest traversal and stopping requirements it actually uses.
- Avoid it when one concrete container type already defines the complete interface.

## 8. Simple Example

Static assertions verify that a vector is a range, its iterator is valid, and its end type is a sentinel for that iterator. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::sentinel_for` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::sentinel_for` in the minimal example?
2. Medium — What relationship does `std::sentinel_for<S, I>` require between `S` and `I`?
3. Hard — Why can an algorithm accept a sentinel of a different type without being able to subtract it from the iterator?
