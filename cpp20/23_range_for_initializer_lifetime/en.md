# Day 23 — Range-for Initializers and Range Lifetime

## 1. Problem It Solves

A C++20 range-for initializer creates named setup state whose lifetime covers the entire loop. It makes an important assumption visible and checkable.

## 2. Prerequisites

- Range-based for loops, scope, and temporary objects.
- You should be able to compile a short program and read its output.

## 3. Core Idea

The initializer is a small antechamber to the loop: objects created there stay alive while every iteration uses the range expression. Read `for (init; declaration : range)` as a precise promise; runtime preconditions still belong to the programmer.

## 4. Minimal Syntax

```cpp
for (std::vector<int> values{1, 2, 3}; int value : values) { /* ... */ }
```

## 5. How It Works

1. The program introduces the smallest relevant form of `for (init; declaration : range)`.
2. It applies the feature to fixed data while required owners remain in scope.
3. It prints one result that can be checked against the source.

## 6. Common Mistakes

- A view into a temporary subobject can still dangle; the initializer should own or otherwise preserve the exact object on which the range depends.
- Also check the required header, C++20 library support, lifetime, and deduced types.

## 7. When to Use It

- Use it when the loop needs a local owner, lock, index, or setup value with loop-only scope.
- Avoid it when the setup object is needed after the loop or a simpler range expression is already safe.

## 8. Simple Example

A vector is created in the initializer and then iterated safely while its sum is accumulated. The companion `.cpp` uses no input, so its result is easy to reproduce.

## 9. Key Takeaways

- `for (init; declaration : range)` expresses the central C++20 idea of this day.
- The example isolates one behavior with fixed data.
- Compiler checks do not replace lifetime and runtime reasoning.
- Prefer the smallest interface that states the real requirement.

## 10. Self-Check Questions

1. Easy — What is the main job of `for (init; declaration : range)` in the minimal example?
2. Medium — When is the vector destroyed relative to the last loop iteration?
3. Hard — Why does naming the owner in the initializer fix some temporary-lifetime bugs but not every possible nested subobject view?
