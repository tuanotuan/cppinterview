# Question 070: Explain the rule of five

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

In C++11 and later, a resource-owning class that defines special members may need all five: destructor, copy constructor, copy assignment, move constructor, and move assignment. Each should be implemented or deleted consistently.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
Type(const Type&) = default; Type(Type&&) noexcept = default;
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to special member functions. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <memory>
#include <utility>

class Owner {
public:
    Owner() : value_(std::make_unique<int>(42)) {}
    ~Owner() = default;
    Owner(const Owner& other) : value_(std::make_unique<int>(*other.value_)) {}
    Owner& operator=(const Owner& other) {
        if (this != &other) value_ = std::make_unique<int>(*other.value_);
        return *this;
    }
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- In C++11 and later, a resource-owning class that defines special members may need all five: destructor, copy constructor, copy assignment, move constructor, and move assignment. Each should be implemented or deleted consistently.
- Estimated difficulty: **Easy**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Easy — Explain the rule of five
