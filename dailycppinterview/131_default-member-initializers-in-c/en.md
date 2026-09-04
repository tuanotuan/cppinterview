# Question 131: What are Default Member Initializers in C++?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Daily C++ Interview collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

A default member initializer supplies an initial value when a constructor does not explicitly initialize that member. Constructors still initialize members in declaration order, and a member initializer in the constructor overrides the default for that construction.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
Prefer the form whose type, lifetime, and control flow are unambiguous.
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to language rules and coding practice. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <iostream>

struct Value {
    int number = 42;
    Value() = default;
    explicit Value(int input) : number(input) {}
};

int main() {
    std::cout << Value{}.number << ' ' << Value{7}.number << '\n';
}
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- A default member initializer supplies an initial value when a constructor does not explicitly initialize that member. Constructors still initialize members in declaration order, and a member initializer in the constructor overrides the default for that construction.
- Estimated difficulty: **Easy**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Easy — What are Default Member Initializers in C++?
