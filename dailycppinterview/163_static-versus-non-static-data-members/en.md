# Question 163: What is the difference between static data members and normal data members?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

Each object contains its own non-static data members, while a static data member belongs to the class and is shared by all objects. A static member has static storage duration and can exist even when no instance exists; since C++17 it can be defined as `inline static` inside the class. Static member functions have no `this` pointer and can directly access only static members, whereas non-static member functions operate on a particular object.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
struct Item { int id{}; inline static int live_count{}; };
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

class Item {
public:
    explicit Item(int id) : id_(id) { ++live_count_; }
    Item(const Item& other) : id_(other.id_) { ++live_count_; }
    ~Item() { --live_count_; }

    int id() const { return id_; }
    static int live_count() { return live_count_; }

private:
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- Each object contains its own non-static data members, while a static data member belongs to the class and is shared by all objects. A static member has static storage duration and can exist even when no instance exists; since C++17 it can be defined as `inline static` inside the class. Static member functions have no `this` pointer and can directly access only static members, whereas non-static member functions operate on a particular object.
- Estimated difficulty: **Medium**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Medium — What is the difference between static data members and normal data members?
