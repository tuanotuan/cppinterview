# Question 174: What are move semantics in C++11, and why are they important?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

Move semantics let an object transfer resources from an expiring source instead of duplicating them, using rvalue references plus move construction or move assignment. `std::move` performs only a cast that makes an object eligible for moving; the selected operation does the transfer. A moved-from standard-library object remains valid but usually has an unspecified value, and marking genuine move operations `noexcept` lets containers prefer them while preserving strong guarantees during reallocation.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
Type(Type&& other) noexcept; target = std::move(source);
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to templates and modern C++ techniques. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Message {
    std::string text;
    std::vector<int> payload;
};

int main() {
    Message source{"ready", {1, 2, 3}};
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- Move semantics let an object transfer resources from an expiring source instead of duplicating them, using rvalue references plus move construction or move assignment. `std::move` performs only a cast that makes an object eligible for moving; the selected operation does the transfer. A moved-from standard-library object remains valid but usually has an unspecified value, and marking genuine move operations `noexcept` lets containers prefer them while preserving strong guarantees during reallocation.
- Estimated difficulty: **Hard**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Hard — What are move semantics in C++11, and why are they important?
