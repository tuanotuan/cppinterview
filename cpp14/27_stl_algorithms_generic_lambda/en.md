# Day 27 — STL Algorithms with Generic Lambdas

## 1. Problem It Solves

Handwritten loops often mix traversal with transformation, filtering, or ordering logic. STL algorithms state the traversal pattern, while a generic lambda supplies the small operation without fixing an unnecessary parameter type.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 6, 9, 25, and 26: algorithms, generic lambdas, containers, iterator ranges, and invalidation.

## 3. Core Idea

Choose the algorithm by intent, pass a valid range, then make the lambda describe only the element-level rule. The algorithm owns iteration; the lambda owns one local decision.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
std::transform(input.begin(), input.end(), output.begin(),
               [](auto value) { return value * value; });
```

## 5. How It Works

1. An output vector is sized before `std::transform` writes one result per input element.
2. The generic lambda deduces the element type and returns its square; `std::count_if` reuses another local predicate.
3. The transformed sequence and the count of even squared values are printed with no manual indexing.

## 6. Common Mistakes

- Writing through `output.begin()` before the output container has enough elements causes undefined behavior.
- Do not copy the pattern without checking input and output range sizes, lambda validity, aliasing, iterator category, and mutation side effects. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a recognized transform, search, count, sort, or partition operation describes the loop.
- Avoid it when the loop has complex control flow or several coupled state transitions that algorithms would obscure.

## 8. Simple Example

A transform squares four values, then a count predicate finds the even results. Each lambda has one expression and the container sizes make write locations explicit.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Algorithms communicate traversal intent best when lambdas remain small, pure, and focused.
- Choose the algorithm by intent, pass a valid range, then make the lambda describe only the element-level rule. The algorithm owns iteration; the lambda owns one local decision.
- The compiler or library follows a precise rule; verify input and output range sizes, lambda validity, aliasing, iterator category, and mutation side effects.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of STL Algorithms with Generic Lambdas?
2. Medium — What sequence does the transform produce from `{1, 2, 3, 4}`, and how many results are even?
3. Hard — Why is pre-sizing `squares` required with `squares.begin()`, while using `std::back_inserter` would change that requirement?
