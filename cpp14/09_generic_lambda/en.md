# Day 9 — Generic Lambdas

## 1. Problem It Solves

A normal C++11 lambda fixes every parameter type, so the same tiny operation may need several copies. C++14 permits `auto` parameters, making the lambda call operator behave like a function template.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 2 and 4: `auto` deduction, lambda syntax, parameters, return values, and captures.

## 3. Core Idea

Imagine the compiler generating one hidden templated call operator. Each distinct argument-type combination creates an appropriate specialization, while the lambda body stays written once.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
auto add = [](auto left, auto right) {
    return left + right;
};
```

## 5. How It Works

1. Calling the lambda with integers deduces integer parameter types for that invocation.
2. A later call with doubles instantiates another call-operator specialization using double arithmetic.
3. One lambda adds both pairs and prints results with the natural type of each addition expression.

## 6. Common Mistakes

- Assuming any two types work is wrong: the body must still be valid for every argument combination actually used.
- Do not copy the pattern without checking the deduced parameter types, available operators, conversions, and deduced return type. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a short local operation is identical across several compatible types, especially inside STL algorithms.
- Avoid it when the accepted type contract must be explicit or invalid calls need clearer diagnostics than unconstrained templates provide.

## 8. Simple Example

The same `add` closure receives two integers and then two doubles. Type deduction occurs separately for each call, so integer and floating-point arithmetic remain distinct.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- A generic lambda is concise template syntax for a local callable, not dynamic typing.
- Imagine the compiler generating one hidden templated call operator. Each distinct argument-type combination creates an appropriate specialization, while the lambda body stays written once.
- The compiler or library follows a precise rule; verify the deduced parameter types, available operators, conversions, and deduced return type.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Generic Lambdas?
2. Medium — What types are deduced for the two parameters in calls with `add(2, 3)` and `add(1.5, 2.0)`?
3. Hard — If one argument is `std::string` and the other is `int`, at what point does the invalid `operator+` become an error?
