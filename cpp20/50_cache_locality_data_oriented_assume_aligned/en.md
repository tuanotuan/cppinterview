# Day 50 — Cache Locality, Data-Oriented Design, and assume_aligned

## 1. Problem It Solves

Performance often depends on arranging frequently processed data contiguously and communicating proven alignment to optimized code. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Arrays, pointers, loops, memory layout, and profiling basics.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The cache fetches neighborhoods, not abstract objects. Data-oriented design lays hot fields along the walking path so each fetched cache line is useful. Read `std::assume_aligned` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
double* aligned = std::assume_aligned<alignof(double)>(values.data());
```

## 5. How It Works

1. The program introduces the smallest relevant form of `std::assume_aligned`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- `assume_aligned` is a promise with no runtime check; giving it a pointer that does not meet the stated alignment creates undefined behavior.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when profiling identifies a hot sequential loop and the data layout can match its access pattern.
- Avoid it when no measurement supports the complexity or alignment cannot be guaranteed.

## 8. Simple Example

Separate contiguous coordinate arrays are traversed linearly, and only the natural `double` alignment is promised safely. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `std::assume_aligned` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `std::assume_aligned` in the minimal example?
2. Medium — Why can separate arrays improve locality when a loop reads only the `x` coordinates?
3. Hard — What exact precondition must hold before replacing `alignof(double)` with a larger claimed alignment?
