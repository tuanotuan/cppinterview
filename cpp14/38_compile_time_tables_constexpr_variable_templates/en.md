# Day 38 — Compile-Time Tables with constexpr and Variable Templates

## 1. Problem It Solves

Small deterministic lookup tables need not be rebuilt during startup or handwritten as error-prone constants. C++14 relaxed `constexpr` can fill a small literal table type in a loop, and a variable template exposes one table per size.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 14-15 and 37: relaxed `constexpr`, variable templates, built-in arrays, loops, and non-type parameters.

## 3. Core Idea

A generator is a pure compile-time recipe and the variable-template specialization stores its result. The table then behaves like ordinary read-only array data at runtime.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<std::size_t N>
struct Table { int values[N]{}; };

template<std::size_t N>
constexpr Table<N> squares = make_squares<N>();
```

## 5. How It Works

1. The non-type parameter fixes array length and the generator initializes every element in a bounded loop.
2. The variable-template initializer calls that generator in a constant-expression context for the requested size.
3. `static_assert` checks one entry and runtime prints the already-generated square table.

## 6. Common Mistakes

- A supposedly compile-time generator that depends on runtime input cannot initialize a `constexpr` table.
- Do not copy the pattern without checking array bounds, deterministic inputs, constant-expression operations, integer overflow, compile-time cost, and table size. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when a small deterministic table removes repeated runtime work and compile-time validation is valuable.
- Avoid it when the table is huge, depends on runtime configuration, or increases build cost and binary size without benefit.

## 8. Simple Example

A generator fills five positions in a tiny literal table with index squares. The variable template `squares<5>` stores the result, and output shows 0, 1, 4, 9, 16.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Compile-time tables trade build work and binary data for predictable runtime lookup.
- A generator is a pure compile-time recipe and the variable-template specialization stores its result. The table then behaves like ordinary read-only array data at runtime.
- The compiler or library follows a precise rule; verify array bounds, deterministic inputs, constant-expression operations, integer overflow, compile-time cost, and table size.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Compile-Time Tables with constexpr and Variable Templates?
2. Medium — What value is stored at index 3 of `squares<5>`?
3. Hard — Why can excessive table size or expensive generation hurt builds even though runtime becomes cheaper?
