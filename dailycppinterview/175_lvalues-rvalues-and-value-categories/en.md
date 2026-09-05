# Question 175: What are lvalues and rvalues?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

An lvalue is a glvalue that is not an xvalue and normally denotes an object whose identity persists; an xvalue is a glvalue whose resources may be reused. A prvalue computes a value or initializes an object, and the term rvalue covers prvalues and xvalues. These value categories affect overload resolution, reference binding, temporary materialization, and move semantics; they are more precise than saying only that lvalues appear on the left and rvalues on the right of assignment.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
use(value); use(std::move(value)); // lvalue, then xvalue
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
#include <utility>

void category(const int&) {
    std::cout << "lvalue" << std::endl;
}

void category(int&&) {
    std::cout << "rvalue" << std::endl;
}

int main() {
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- An lvalue is a glvalue that is not an xvalue and normally denotes an object whose identity persists; an xvalue is a glvalue whose resources may be reused. A prvalue computes a value or initializes an object, and the term rvalue covers prvalues and xvalues. These value categories affect overload resolution, reference binding, temporary materialization, and move semantics; they are more precise than saying only that lvalues appear on the left and rvalues on the right of assignment.
- Estimated difficulty: **Hard**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Hard — What are lvalues and rvalues?
