# Question 155: What is function overloading in C++ (compile-time polymorphism)?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

Function overloading declares multiple functions with the same name in the same scope but different parameter lists or, for member functions, qualifying cv/ref details. Overload resolution selects the best viable candidate at compile time from the argument types and conversions. A return type alone cannot distinguish overloads, and conversions or default arguments can make a call ambiguous.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
void print(int value); void print(std::string_view value);
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
#include <string_view>

void print(int value) {
    std::cout << "integer: " << value << std::endl;
}

void print(std::string_view value) {
    std::cout << "text: " << value << std::endl;
}

int main() {
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- Function overloading declares multiple functions with the same name in the same scope but different parameter lists or, for member functions, qualifying cv/ref details. Overload resolution selects the best viable candidate at compile time from the argument types and conversions. A return type alone cannot distinguish overloads, and conversions or default arguments can make a call ambiguous.
- Estimated difficulty: **Medium**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Medium — What is function overloading in C++ (compile-time polymorphism)?
