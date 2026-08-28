# Day 20 — Rule of Five, Rule of Zero, and noexcept Move

## 1. Problem It Solves

The Rule of Five completes manual ownership semantics, the Rule of Zero delegates ownership to RAII members, and `noexcept` tells containers moving cannot throw. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 19, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: The Rule of Five completes manual ownership semantics, the Rule of Zero delegates ownership to RAII members, and `noexcept` tells containers moving cannot throw. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
Owner(Owner&& other) noexcept; Owner& operator=(Owner&& other) noexcept;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Declaring a move operation `noexcept` when it can actually throw causes `std::terminate`; omitting a true guarantee may make containers copy instead.

## 7. When to Use It

- Use it when reviewing ownership types, while preferring Rule of Zero for new code.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A manual owner defines all five special operations with non-throwing moves, while a string-only type needs none of them. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Declaring a move operation `noexcept` when it can actually throw causes `std::terminate`; omitting a true guarantee may make containers copy instead. What is the smallest C++11-safe correction?
