# Day 36 — Variadic Templates and Parameter Packs

## 1. Problem It Solves

Some operations naturally accept a compile-time-varying number of differently typed arguments. Variadic templates collect those arguments into parameter packs, and pack expansion applies a pattern once per element.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 5, 34, and 35: templates, deduction, recursion or expansion contexts, and compile-time argument counts.

## 3. Core Idea

A pack is a compile-time sequence, not a runtime container. The ellipsis expands a syntactic pattern, and `sizeof...(pack)` reports the number of elements.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<class... Values>
void print_all(const Values&... values) {
    int sink[] = {0, ((void)(std::cout << values), 0)...};
}
```

## 5. How It Works

1. Deduction places each call argument type and value into matching template and function parameter packs.
2. The initializer-list pattern expands once for each value and guarantees left-to-right evaluation in this C++14 technique.
3. One function prints an integer, string literal, and floating-point value, then reports a compile-time count of three.

## 6. Common Mistakes

- A pack cannot be used alone where the grammar requires one expression; it must appear in a valid expansion context.
- Do not copy the pattern without checking where the ellipsis applies, evaluation order, empty-pack behavior, forwarding, recursion termination, and diagnostics. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when argument count and types are known at compile time but vary between calls.
- Avoid it when arguments are homogeneous runtime data better stored in a container.

## 8. Simple Example

The sample expands a print expression for three heterogeneous values. A one-element dummy array keeps the zero-argument case well-formed and makes each side effect sequenced.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Parameter packs represent compile-time variation; expansion context determines what code is repeated.
- A pack is a compile-time sequence, not a runtime container. The ellipsis expands a syntactic pattern, and `sizeof...(pack)` reports the number of elements.
- The compiler or library follows a precise rule; verify where the ellipsis applies, evaluation order, empty-pack behavior, forwarding, recursion termination, and diagnostics.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Variadic Templates and Parameter Packs?
2. Medium — What value does `sizeof...(values)` have for a call with three arguments?
3. Hard — Why does the dummy leading zero keep the initializer array valid even when the parameter pack is empty?
