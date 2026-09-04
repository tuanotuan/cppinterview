# Question 045: Why should we use nullptr instead of NULL or 0?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Daily C++ Interview collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

`nullptr` has type `std::nullptr_t` and converts only to pointer-like targets, so it avoids the integer overload ambiguities of `0` and implementation-defined macro forms of `NULL`. It communicates a null pointer directly.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
Use the language construct that makes the contract compiler-checkable.
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to modern C++ practices. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <cstddef>
#include <iostream>

void choose(int) { std::cout << "integer\n"; }
void choose(const int*) { std::cout << "pointer\n"; }

int main() {
    choose(nullptr);
}
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- `nullptr` has type `std::nullptr_t` and converts only to pointer-like targets, so it avoids the integer overload ambiguities of `0` and implementation-defined macro forms of `NULL`. It communicates a null pointer directly.
- Estimated difficulty: **Easy**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Easy — Why should we use nullptr instead of NULL or 0?
