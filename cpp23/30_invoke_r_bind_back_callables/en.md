# Day 30 — `std::invoke_r`, `std::bind_back`, and Callable Utilities

## 1. Problem It Solves

Callable code must handle free functions, member pointers, and function objects consistently. `std::invoke_r` also requests a result type, while `std::bind_back` stores arguments at the end of a future call. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 28: type-erased callables.
- Day 29: forwarding and argument categories.

## 3. Core Idea

`std::invoke` is the universal call button. The `_r` form places a result-type adapter around it; `bind_back` creates a new button with the last slots already filled. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
long n = std::invoke_r<long>(callable, 2, 3);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::invoke_r`, `std::bind_back`, and Callable Utilities.
1. It invokes addition with an explicit result type and conditionally binds a trailing argument. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a converted sum and, when available, the result of the bound callable, making the important behavior easy to verify.

## 6. Common Mistakes

- A requested `R` that is not implicitly convertible from the actual result makes `invoke_r` ill-formed; storing references in a bound object can outlive their referents.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves generic dispatch layers and small partial applications with clear ownership of bound values.
- Avoid it when the task involves complex argument rearrangement where a named lambda is easier to read.

## 8. Simple Example

A filter factory binds a fixed upper limit at the back and leaves the measured value as the future argument. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — If a callable returns `double`, when is `std::invoke_r<int>` valid, and how does this differ from requiring the callable to declare `int` itself?
