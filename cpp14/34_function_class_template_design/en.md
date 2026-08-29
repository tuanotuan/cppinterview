# Day 34 — Designing Function Templates and Class Templates

## 1. Problem It Solves

Generic code should reuse a real type-independent idea without erasing useful static information. Function templates parameterize behavior, while class templates parameterize a data representation and its operations.

Focus on the smallest useful form, its observable behavior, and its safety boundary.

## 2. Prerequisites

- Days 2, 5, 15, and 33: type deduction, template parameters, constructors, operators, and value semantics.

## 3. Core Idea

Start from a concrete operation that works for multiple types, identify the minimal required expressions, and turn only those types or values into parameters. Every instantiation must satisfy the implicit contract.

Identify the objects and types, today's operation, and the printed result. This connects syntax to behavior.

## 4. Minimal Syntax

```cpp
template<class T>
T max_value(const T& a, const T& b);

template<class T>
class Box { T value_; };
```

## 5. How It Works

1. The function template deduces one common `T` and compares two values through `operator<`.
2. The class template stores a value of its chosen `T` and exposes a const-reference accessor.
3. Separate integer and string instantiations reuse the definitions while retaining static types.

## 6. Common Mistakes

- Making code a template before identifying its required operations produces accidental constraints and difficult errors.
- Do not copy the pattern without checking deduction, required operators, copy/move costs, reference lifetime, specialization needs, and API clarity. A program may compile while still having the wrong lifetime, ownership, invalidation, ordering, or performance behavior.

## 7. When to Use It

- Use it when the same semantics apply to several types that satisfy a small, stable operation contract.
- Avoid it when runtime polymorphism, one concrete type, or ordinary overloads model the domain more clearly.

## 8. Simple Example

A generic maximum function compares integers, while a generic `Box` owns a string. The examples show behavior reuse and representation reuse separately.

The `.cpp` file uses fixed data. Predict its output, compile it, then change one value and test the prediction.

## 9. Key Takeaways

- Good templates parameterize genuine variation and keep required operations small and visible.
- Start from a concrete operation that works for multiple types, identify the minimal required expressions, and turn only those types or values into parameters. Every instantiation must satisfy the implicit contract.
- The compiler or library follows a precise rule; verify deduction, required operators, copy/move costs, reference lifetime, specialization needs, and API clarity.
- Prefer the smallest form that communicates intent and measure costs when performance matters.

## 10. Self-Check Questions

1. Easy — What is the main purpose of Designing Function Templates and Class Templates?
2. Medium — What type is deduced for `max_value(3, 7)`, and what operation must that type support?
3. Hard — Why does `max_value(1, 2.5)` fail deduction for one `T` even though the language can convert `int` to `double`?
