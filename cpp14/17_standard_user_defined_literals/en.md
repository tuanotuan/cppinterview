# Day 17 — Standard User-Defined Literals for string, chrono, and complex

## 1. Problem It Solves

A raw literal such as `"hello"` or `250` does not by itself express an owning string, a time unit, or an imaginary number. C++14 standard literal suffixes construct strongly typed library values directly.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 1-2; namespaces, `std::string`, numeric literals, and basic standard-library types.

## 3. Core Idea

A suffix acts like a compile-time conversion chosen by namespace lookup. The token remains concise, but its resulting type carries ownership or unit meaning into later operations.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
using namespace std::string_literals;
auto text = "C++14"s;
using namespace std::chrono_literals;
auto delay = 250ms;
```

## 5. How It Works

1. Bringing a literal namespace into scope makes its standard suffix candidates available.
2. Each suffix constructs a different type: `std::string`, a chrono duration, or `std::complex`.
3. The program prints the string, the millisecond count, and the imaginary component with their intended meanings intact.

## 6. Common Mistakes

- Forgetting the correct literal namespace makes the suffix unavailable, while broad namespace imports can create suffix ambiguity.
- Do not copy the pattern without checking the suffix namespace, resulting library type, unit, precision, and overload selected. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a standard suffix makes ownership or units visible and prevents mixing unrelated raw numbers.
- Avoid it when the suffix is unfamiliar to the team or a named constant would communicate domain meaning better.

## 8. Simple Example

The sample creates an owning string with `s`, a duration with `ms`, and a pure imaginary complex value with `i`. Their member functions reveal the distinct types.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Standard literals make units and library value categories part of the type system.
- A suffix acts like a compile-time conversion chosen by namespace lookup. The token remains concise, but its resulting type carries ownership or unit meaning into later operations.
- The compiler or library follows a precise rule; verify the suffix namespace, resulting library type, unit, precision, and overload selected.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Standard User-Defined Literals for string, chrono, and complex?
2. Medium — What are the types produced by `"C++14"s`, `250ms`, and `2.0i`?
3. Hard — Why does `250ms + 1s` preserve unit-safe arithmetic better than adding two unrelated integers?
