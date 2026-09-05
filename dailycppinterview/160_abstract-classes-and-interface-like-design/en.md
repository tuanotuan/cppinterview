# Question 160: What is the difference between an abstract class and an interface in C++? How do you implement interface-like behavior?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

An abstract class has at least one pure virtual function and may also own state, constructors, non-virtual functions, and implemented virtual functions. C++ has no `interface` keyword; an interface-like runtime contract is normally an abstract class containing only the required pure virtual operations plus a virtual destructor when deletion through the base is supported. C++20 concepts provide a separate compile-time contract for generic code without inheritance or runtime dispatch.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
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

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Square final : public Shape {
public:
    explicit Square(double side) : side_(side) {}
    double area() const override { return side_ * side_; }
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- An abstract class has at least one pure virtual function and may also own state, constructors, non-virtual functions, and implemented virtual functions. C++ has no `interface` keyword; an interface-like runtime contract is normally an abstract class containing only the required pure virtual operations plus a virtual destructor when deletion through the base is supported. C++20 concepts provide a separate compile-time contract for generic code without inheritance or runtime dispatch.
- Estimated difficulty: **Medium**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Medium — What is the difference between an abstract class and an interface in C++? How do you implement interface-like behavior?
