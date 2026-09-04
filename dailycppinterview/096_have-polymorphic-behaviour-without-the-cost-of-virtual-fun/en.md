# Question 096: Is it possible to have polymorphic behaviour without the cost of virtual functions?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

Yes. Templates, CRTP, concepts, and discriminated unions such as `std::variant` can provide static or closed-set polymorphism without virtual dispatch. The trade-offs include compile-time coupling, code size, and less runtime extensibility.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
Make ownership, invariants, and dispatch explicit in the interface.
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to object-oriented design. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <iostream>
#include <variant>

struct Circle { double radius; };
struct Square { double side; };

int main() {
    std::variant<Circle, Square> shape = Square{2.0};
    const auto area = std::visit([](const auto& value) {
        if constexpr (requires { value.radius; }) return 3.14 * value.radius * value.radius;
        else return value.side * value.side;
    }, shape);
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- Yes. Templates, CRTP, concepts, and discriminated unions such as `std::variant` can provide static or closed-set polymorphism without virtual dispatch. The trade-offs include compile-time coupling, code size, and less runtime extensibility.
- Estimated difficulty: **Hard**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Hard — Is it possible to have polymorphic behaviour without the cost of virtual functions?
