# Day 5 — Reviewing Templates, Parameter Packs, Type Traits, and constexpr

## 1. Problem It Solves

Repeating the same algorithm for many types creates duplicated code. Templates describe a family of declarations, parameter packs accept a varying number of template arguments, type traits inspect types, and `constexpr` permits work during compilation.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 1-4; functions, overloads, recursion, `auto`, and compile-time constants from C++11.

## 3. Core Idea

Templates are compile-time recipes. Instantiation substitutes concrete types, traits provide Boolean facts about them, and a constant-expression call may be evaluated before the program starts.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<class T, class... Rest>
constexpr T sum(T first, Rest... rest);
```

## 5. How It Works

1. Each call deduces concrete argument types and expands the pack into a smaller recursive call.
2. A type trait checks the resulting type, while `constexpr` lets the compiler use the result in `static_assert`.
3. The same definition sums several integral values and proves the expected result during compilation.

## 6. Common Mistakes

- Expanding a pack without a terminating overload or mixing incompatible types can produce long, confusing diagnostics.
- Do not copy the pattern without checking the base case, deduced common type, trait condition, and constant-expression restrictions. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when one operation genuinely applies to a family of types or argument counts and compile-time checking adds value.
- Avoid it when ordinary overloads are clearer or template diagnostics would outweigh the small amount of reuse.

## 8. Simple Example

A small recursive `sum` accepts three integers. `std::common_type` chooses a compatible result type and `static_assert` verifies the answer before runtime.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Compile-time abstraction is useful when its constraints and termination rules remain visible.
- Templates are compile-time recipes. Instantiation substitutes concrete types, traits provide Boolean facts about them, and a constant-expression call may be evaluated before the program starts.
- The compiler or library follows a precise rule; verify the base case, deduced common type, trait condition, and constant-expression restrictions.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Reviewing Templates, Parameter Packs, Type Traits, and constexpr?
2. Medium — How many recursive calls remain after invoking `sum(1, 2, 3)` and reaching the one-argument base case?
3. Hard — Why must the return type account for every pack element instead of simply using the type of the first argument?
