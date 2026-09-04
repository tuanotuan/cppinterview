# Question 069: Explain the rule of three

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Daily C++ Interview collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

If a class directly manages a resource and needs a user-defined destructor, it commonly also needs a copy constructor and copy assignment operator with coherent ownership semantics. This Rule of Three is a warning to define or delete the whole copy contract.

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
#include <algorithm>
#include <cstddef>

class Buffer {
public:
    explicit Buffer(std::size_t size) : size_(size), data_(new int[size]{}) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& other) : Buffer(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    Buffer& operator=(const Buffer& other) {
        if (this == &other) return *this;
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- If a class directly manages a resource and needs a user-defined destructor, it commonly also needs a copy constructor and copy assignment operator with coherent ownership semantics. This Rule of Three is a warning to define or delete the whole copy contract.
- Estimated difficulty: **Easy**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Easy — Explain the rule of three
