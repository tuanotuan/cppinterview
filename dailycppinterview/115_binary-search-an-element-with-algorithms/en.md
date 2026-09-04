# Question 115: Binary search an element with algorithms!

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Daily C++ Interview collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

`std::binary_search` requires the range to be partitioned according to the same ordering used by the search, which a normally sorted range satisfies. Sort first or maintain the invariant; calling it on the unsorted sample violates its precondition, so the result cannot be trusted.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
std::algorithm(first, last, ...); // satisfy the documented range contract
~~~

Syntax is only the starting point. Check types, value categories, lifetimes, and preconditions rather than inferring behavior from a name.

## 5. How It Works

1. Identify the entity or expression named by the question.
2. Apply the relevant C++ rule before predicting output or performance.
3. Call out exceptions, implementation dependence, or undefined behavior where applicable.
4. Verify the reasoning with a minimal program and strict warnings.

## 6. Common Mistakes

- Treating one observed run as the language rule.
- Confusing ownership with access, or compile-time selection with runtime dispatch.
- Ignoring a precondition, lifetime, or implicit conversion.
- Giving an absolute answer when the result depends on context.

## 7. When to Use It

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to the standard library. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers{1, 54, 7, 5335, 8};
    std::sort(numbers.begin(), numbers.end());
    std::cout << std::boolalpha
              << std::binary_search(numbers.begin(), numbers.end(), 7) << '\n';
}
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- `std::binary_search` requires the range to be partitioned according to the same ordering used by the search, which a normally sorted range satisfies. Sort first or maintain the invariant; calling it on the unsorted sample violates its precondition, so the result cannot be trusted.
- Estimated difficulty: **Medium**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Medium — Binary search an element with algorithms!
