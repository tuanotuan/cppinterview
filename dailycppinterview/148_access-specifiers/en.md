# Question 148: What are access modifiers in C++?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

The access specifiers `public`, `protected`, and `private` control where class members can be named. Public members are generally accessible, protected members are accessible to the class, friends, and derived classes, and private members to the class and friends; a `class` defaults to private access while a `struct` defaults to public. Access control is a compile-time interface rule, not a memory-security boundary.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
class Account { public: void deposit(); protected: void audit(); private: int balance{}; };
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

class Account {
public:
    void deposit(int amount) {
        if (amount > 0) balance_ += amount;
        record_activity();
    }

    int balance() const { return balance_; }

protected:
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- The access specifiers `public`, `protected`, and `private` control where class members can be named. Public members are generally accessible, protected members are accessible to the class, friends, and derived classes, and private members to the class and friends; a `class` defaults to private access while a `struct` defaults to public. Access control is a compile-time interface rule, not a memory-security boundary.
- Estimated difficulty: **Easy**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Easy — What are access modifiers in C++?
