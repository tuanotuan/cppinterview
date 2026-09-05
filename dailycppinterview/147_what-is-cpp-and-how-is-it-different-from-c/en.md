# Question 147: What is C++? How is it different from C?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

C++ is a general-purpose, multi-paradigm language that evolved from C and adds abstraction mechanisms such as classes, templates, RAII, overloading, exceptions, and a rich standard library. C and C++ share much syntax but are separate languages with different type rules, object and lifetime models, valid programs, and idioms; C++ is not merely C with classes.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
template<class T> T twice(T value); // generic C++ abstraction
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to C++ foundations, storage, and parameter passing. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <iostream>
#include <vector>

template<class T>
T sum(const std::vector<T>& values) {
    T result{};
    for (const T& value : values) result += value;
    return result;
}

int main() {
    const std::vector<int> values{1, 2, 3};
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- C++ is a general-purpose, multi-paradigm language that evolved from C and adds abstraction mechanisms such as classes, templates, RAII, overloading, exceptions, and a rich standard library. C and C++ share much syntax but are separate languages with different type rules, object and lifetime models, valid programs, and idioms; C++ is not merely C with classes.
- Estimated difficulty: **Easy**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Easy — What is C++? How is it different from C?
