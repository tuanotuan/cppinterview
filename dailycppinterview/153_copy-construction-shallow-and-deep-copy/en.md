# Question 153: Explain shallow copy, deep copy, and the copy constructor in C++.

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

A copy constructor initializes a new object from an existing object. An implicitly generated copy performs memberwise copy: value members become independent values, while a raw pointer member copies only its address, which can look like a shallow copy and can break ownership. A deep-copying owner allocates a distinct resource and copies its contents, but the preferred design is the Rule of Zero—store resources in value-semantic RAII members so generated copy and destruction already have the right behavior.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
Type(const Type& other); Type& operator=(const Type& other);
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to object design, functions, and exception safety. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <iostream>
#include <memory>

class Number {
public:
    explicit Number(int value) : value_(std::make_unique<int>(value)) {}

    Number(const Number& other)
        : value_(std::make_unique<int>(*other.value_)) {}

    Number& operator=(const Number& other) {
        if (this != &other) value_ = std::make_unique<int>(*other.value_);
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- A copy constructor initializes a new object from an existing object. An implicitly generated copy performs memberwise copy: value members become independent values, while a raw pointer member copies only its address, which can look like a shallow copy and can break ownership. A deep-copying owner allocates a distinct resource and copies its contents, but the preferred design is the Rule of Zero—store resources in value-semantic RAII members so generated copy and destruction already have the right behavior.
- Estimated difficulty: **Medium**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Medium — Explain shallow copy, deep copy, and the copy constructor in C++.
