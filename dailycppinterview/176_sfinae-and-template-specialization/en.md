# Question 176: What is SFINAE? How does it relate to template specialization?

## 1. Problem It Solves

This is one self-contained C++ interview topic from the Real-World C++ Interviews collection. The goal is to give the conclusion, name the governing rule, and separate standard behavior from compiler-specific details.

## 2. Prerequisites

- Basic C++ syntax and expression-type reasoning.
- Lifetime, ownership, overload resolution, or library contracts when relevant.
- The ability to trace a minimal example before drawing a conclusion.

## 3. Core Idea

SFINAE means Substitution Failure Is Not An Error: when substitution fails in the immediate context of a function-template candidate, that candidate is removed from overload resolution instead of making the program ill-formed. It can enable overloads or partial class specializations conditionally, but it is not itself explicit specialization, and function templates cannot be partially specialized. In C++20, constraints and concepts usually express the same intent more clearly and produce better diagnostics.

A strong interview answer leads with the conclusion, states the conditions under which it holds, and closes with the practical consequence.

## 4. Minimal Syntax

~~~cpp
template<class T, std::enable_if_t<condition<T>, int> = 0> void use(T value);
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

Use this knowledge while reviewing APIs, reading code, explaining diagnostics, or designing abstractions related to templates and modern C++ techniques. In production, prefer forms that make the contract visible and compiler-checkable.

## 8. Simple Example

The companion <code>main.cpp</code> is a small, self-contained C++20 example:

~~~cpp
#include <iostream>
#include <type_traits>

template<class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
T twice(T value) {
    return value + value;
}

template<class T>
struct TypeName {
    static constexpr const char* value = "other";
};
~~~

Run it with strict warnings to verify the reasoning instead of memorizing output.

## 9. Key Takeaways

- SFINAE means Substitution Failure Is Not An Error: when substitution fails in the immediate context of a function-template candidate, that candidate is removed from overload resolution instead of making the program ill-formed. It can enable overloads or partial class specializations conditionally, but it is not itself explicit specialization, and function templates cannot be partially specialized. In C++20, constraints and concepts usually express the same intent more clearly and produce better diagnostics.
- Estimated difficulty: **Hard**.
- This lesson keeps exactly one source question; no Easy/Medium/Hard variants are generated.
- The explanation and sample code are independently authored around the interview topic.

## 10. Self-Check Question

1. Hard — What is SFINAE? How does it relate to template specialization?
