# Day 35 — Type-Trait Aliases, SFINAE, and std::enable_if

## 1. Problem It Solves

A template body may only make sense for certain types, yet unconstrained declarations participate in overload resolution for everything. SFINAE removes a candidate when substitution fails, and `std::enable_if_t` expresses a Boolean participation condition compactly.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 5, 15, and 34: templates, type traits, aliases, overload resolution, and substitution.

## 3. Core Idea

Substitution failure is a filter, not a program error, while candidates are being formed. `enable_if` defines its nested type only when the condition is true, so false candidates disappear.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<class T>
using integral_t = std::enable_if_t<std::is_integral<T>::value, T>;

template<class T>
integral_t<T> twice(T value);
```

## 5. How It Works

1. Template argument deduction proposes a concrete `T` for the call.
2. The trait evaluates whether `T` is integral; only then does the alias produce a valid return type.
3. Integer calls compile and print doubled values, while a floating-point call would have no matching candidate.

## 6. Common Mistakes

- Placing the condition where it is not part of substitution can turn intended SFINAE into a hard compilation error.
- Do not copy the pattern without checking the trait expression, substitution context, overload ambiguity, diagnostics, and whether a simpler overload is enough. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a C++14 overload must participate only for a precisely testable family of types.
- Avoid it when the condition becomes complex or a named wrapper and static assertion would teach users more clearly.

## 8. Simple Example

The alias `integral_result_t` exists only for integral types. `twice` therefore accepts `int` and `long` but excludes `double`.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- SFINAE controls candidate participation during substitution; it is not a runtime branch.
- Substitution failure is a filter, not a program error, while candidates are being formed. `enable_if` defines its nested type only when the condition is true, so false candidates disappear.
- The compiler or library follows a precise rule; verify the trait expression, substitution context, overload ambiguity, diagnostics, and whether a simpler overload is enough.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Type-Trait Aliases, SFINAE, and std::enable_if?
2. Medium — Why does `twice(21)` produce a viable template specialization?
3. Hard — What distinction separates a substitution failure that removes a candidate from an error in the instantiated function body?
