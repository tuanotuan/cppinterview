# Day 31 — Alias Templates and Type Traits

## 1. Problem It Solves

An alias template computes a readable type name from parameters, while type traits expose compile-time facts and type transformations. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 30, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: An alias template computes a readable type name from parameters, while type traits expose compile-time facts and type transformations. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
template<class T> using Vec = std::vector<T>; std::is_integral<T>::value;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- A trait describes a compile-time property, not a runtime inspection; applying the wrong transformed type can change references or constness.

## 7. When to Use It

- Use it when generic code needs concise derived types or compile-time classification.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A vector alias creates an integer sequence, and traits report whether selected types are integral or references. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: A trait describes a compile-time property, not a runtime inspection; applying the wrong transformed type can change references or constness. What is the smallest C++11-safe correction?
