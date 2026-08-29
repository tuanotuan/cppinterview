# Day 12 — Function Return Type Deduction with auto

## 1. Problem It Solves

A function return type can be long or dependent on an expression. C++14 allows a normal function to use `auto` as its return placeholder, letting the compiler deduce the type from its return statement.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 2 and 9: `auto` deduction, expression types, function returns, and generic lambdas.

## 3. Core Idea

The function still has one static return type. The compiler examines all reachable value-returning statements and requires them to deduce the same type; this is compile-time deduction, not runtime variation.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
auto square(int value) {
    return value * value;
}
```

## 5. How It Works

1. The compiler determines the type of the return expression after ordinary arithmetic conversions.
2. That deduced type becomes the function's fixed return type for declarations and calls.
3. The integer function returns an integer, while a separate function using double arithmetic returns a double.

## 6. Common Mistakes

- Returning `int` on one branch and `double` on another does not automatically choose a common type; deduction fails.
- Do not copy the pattern without checking every return expression, implicit conversions inside those expressions, and whether a reference is intended. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when the expression makes the result type obvious and manually repeating it would be fragile.
- Avoid it when an explicit return type better documents an API contract or accidental type changes must be prevented.

## 8. Simple Example

The sample defines `square` for integers and `half` for doubles. Each body contains one clear return expression, making its deduced type easy to inspect.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Return-type deduction removes spelling, but it does not remove the single-type requirement.
- The function still has one static return type. The compiler examines all reachable value-returning statements and requires them to deduce the same type; this is compile-time deduction, not runtime variation.
- The compiler or library follows a precise rule; verify every return expression, implicit conversions inside those expressions, and whether a reference is intended.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Function Return Type Deduction with auto?
2. Medium — What return types are deduced for `square(int)` and `half(double)`?
3. Hard — Why does a function with `return 1;` and `return 2.0;` on different branches fail `auto` return deduction?
