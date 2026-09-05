# Question 159: What is object slicing in C++? How can you avoid it?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

Object slicing occurs when a derived object is copied into a base object by value, so the new object contains only the base subobject and loses derived state and behavior. Avoid it by passing and storing polymorphic objects through references or owning smart pointers, and give a polymorphic base a virtual destructor. When true value semantics are required, use a virtual `clone`, type erasure, or a closed sum type such as `std::variant` instead of accidental base-value copies.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
void inspect(const Base& value); // preserve the derived dynamic type
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

struct Base {
    virtual ~Base() = default;
    virtual const char* name() const { return "Base"; }
};

struct Derived final : Base {
    const char* name() const override { return "Derived"; }
};

void print(const Base& value) {
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- Object slicing occurs when a derived object is copied into a base object by value, so the new object contains only the base subobject and loses derived state and behavior. Avoid it by passing and storing polymorphic objects through references or owning smart pointers, and give a polymorphic base a virtual destructor. When true value semantics are required, use a virtual `clone`, type erasure, or a closed sum type such as `std::variant` instead of accidental base-value copies.
- Estimated difficulty: **Medium**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Medium — What is object slicing in C++? How can you avoid it?
