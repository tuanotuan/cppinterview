# Question 019: What’s the output of the following sample program? Is that what you’d expect? Why? Why not?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Daily C++ Interview collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

The program prints `Dog speaks`, `Dog eats 42`, `Animal speaks`, then `Animal eats 42`. `speak` is not virtual, while `Dog::eat(unsigned)` does not override `Animal::eat(int)`; `override` would expose both mistakes at compile time.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
virtual void run(); // derived: void run() override;
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to polymorphism, inheritance, and virtual functions. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <iostream>
#include <memory>

class Animal {
public:
    ~Animal() = default;

    virtual void eat(int quantity) {
        std::cout << "Animal eats " << quantity << '\n';
    }

    void speak() {
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- The program prints `Dog speaks`, `Dog eats 42`, `Animal speaks`, then `Animal eats 42`. `speak` is not virtual, while `Dog::eat(unsigned)` does not override `Animal::eat(int)`; `override` would expose both mistakes at compile time.
- Estimated difficulty: **Hard**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Hard — What’s the output of the following sample program? Is that what you’d expect? Why? Why not?
