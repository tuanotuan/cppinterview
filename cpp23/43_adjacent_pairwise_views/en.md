# Day 43 — Adjacent, Adjacent-Transform, and Pairwise Views

## 1. Problem It Solves

Neighbor-based algorithms need overlapping windows. C++23 `adjacent<N>` yields tuples of `N` consecutive elements, `adjacent_transform<N>` computes from each tuple, and `pairwise` names the common `N = 2` case. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 42: tuple-producing range views.
- Basic sliding comparisons.

## 3. Core Idea

Move a window one element at a time. Unlike chunking, consecutive windows overlap, so one source element may participate in several outputs. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
for (auto [a, b] : values | std::views::pairwise) { }
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Adjacent, Adjacent-Transform, and Pairwise Views.
1. It reads neighboring pairs and conditionally transforms them into differences. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks one result for every valid overlapping window, making the important behavior easy to verify.

## 6. Common Mistakes

- Expecting output from a range shorter than `N` is wrong; returning references derived from a temporary source can dangle with the view.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves deltas, trend detection, local comparisons, and fixed-width rolling calculations.
- Avoid it when the task involves non-overlapping batching, which is better represented by `chunk`.

## 8. Simple Example

A temperature monitor uses pairwise values to print the change between consecutive readings. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — For an input of length `m` and `adjacent<N>`, what is the output length when `m >= N`, and why is it not `m / N`?
