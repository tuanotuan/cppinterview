# Question 156: What is the difference between struct and class in C++?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

`struct` and `class` define the same kind of class type and can both have constructors, member functions, templates, inheritance, and virtual dispatch. The language differences are defaults: members and base classes are public in a `struct`, but private in a `class`. Conventionally, structs model simple value-like aggregates and classes emphasize hidden invariants, but that is a style choice rather than a language restriction.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
struct S { int value; }; class C { int value; };
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

struct Point {
    int x{};
    int y{};
};

class Counter {
public:
    explicit Counter(int value) : value_(value) {}
    int value() const { return value_; }
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- `struct` and `class` define the same kind of class type and can both have constructors, member functions, templates, inheritance, and virtual dispatch. The language differences are defaults: members and base classes are public in a `struct`, but private in a `class`. Conventionally, structs model simple value-like aggregates and classes emphasize hidden invariants, but that is a style choice rather than a language restriction.
- Estimated difficulty: **Medium**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Medium — What is the difference between struct and class in C++?
