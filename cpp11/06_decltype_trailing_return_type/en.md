# Day 6 — decltype and Trailing Return Types

## 1. Problem It Solves

`decltype` reports the type of an expression without evaluating it, and a trailing return type lets a function name parameter-dependent result types. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 5, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: `decltype` reports the type of an expression without evaluating it, and a trailing return type lets a function name parameter-dependent result types. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
auto add(T a, U b) -> decltype(a + b);
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- `decltype(name)` and `decltype((name))` can produce different types because the parenthesized form examines the expression category.

## 7. When to Use It

- Use it when a return type depends on an expression involving function parameters.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A small `add` function returns the exact type of `a + b`; adding an `int` and a `double` produces a `double` result. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: `decltype(name)` and `decltype((name))` can produce different types because the parenthesized form examines the expression category. What is the smallest C++11-safe correction?
