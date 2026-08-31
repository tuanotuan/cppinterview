# Day 48 — Fold Algorithms, `ranges::iota`, and Shift Algorithms

## 1. Problem It Solves

C++23 adds named left and right folds and a range-based iota fill, complementing the existing shift algorithms that move elements within a sequence. Direction and returned boundaries become explicit. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 5: algorithms over ranges.
- Day 47: C++23 constrained algorithms.

## 3. Core Idea

A fold compresses a sequence into one value with a chosen direction. `ranges::iota` writes increasing values; shifts move surviving elements and return the new logical boundary. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
auto sum = std::ranges::fold_left(values, 0, std::plus{});
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Fold Algorithms, `ranges::iota`, and Shift Algorithms.
1. It fills, folds, and shifts a small integer range when the C++23 algorithms are present. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a total and the sequence up to the returned logical end, making the important behavior easy to verify.

## 6. Common Mistakes

- Left and right folds differ for non-associative operations; elements beyond a shift's returned boundary remain valid but have unspecified values.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves reductions with deliberate direction, sequential fills, and in-place removal-style shifts.
- Avoid it when the task involves parallel reduction assumptions for operations that are not associative or code that reads the unspecified tail after a shift.

## 8. Simple Example

A buffer numbers its slots, folds active sizes into a total, then shifts remaining entries left after consuming one item. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — For subtraction, compare a left fold and a right fold over `1, 2, 3`; why does associativity determine whether direction may be ignored?
