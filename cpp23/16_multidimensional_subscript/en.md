# Day 16 — Multidimensional Subscript Operator

## 1. Problem It Solves

Before C++23, a custom matrix usually used chained brackets or `operator()`. C++23 allows an overloaded subscript operator to accept several indices directly as `grid[row, column]`. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 15: static `operator[]` and operator overloading.
- Arrays and row-major indexing.

## 3. Core Idea

The brackets become one function call with several arguments. The class maps those logical coordinates to its chosen physical layout. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
int& operator[](std::size_t row, std::size_t column);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Multidimensional Subscript Operator.
1. It stores and reads one element through a two-index subscript. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the value at the selected row and column, making the important behavior easy to verify.

## 6. Common Mistakes

- Omitting bounds checks can produce undefined behavior; confusing this syntax with the built-in comma operator on old compilers changes meaning.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves matrix, image, tensor, or table abstractions where coordinate notation improves readability.
- Avoid it when the task involves a raw flat buffer when a simple computed index is clearer and no abstraction is needed.

## 8. Simple Example

A small image stores six pixels in row-major order and accesses the bottom-right pixel as `image[1, 2]`. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why does `a[i, j]` call one two-parameter overload in C++23 but may evaluate a comma expression for a type without that overload?
