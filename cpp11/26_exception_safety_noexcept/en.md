# Day 26 — Exception Safety and noexcept

## 1. Problem It Solves

Exception safety defines what state remains when an operation fails, while `noexcept` records that a function promises not to let exceptions escape. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 25, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Exception safety defines what state remains when an operation fails, while `noexcept` records that a function promises not to let exceptions escape. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
void cleanup() noexcept; try { risky(); } catch (const std::exception& e) { }
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Letting an exception escape a `noexcept` function calls `std::terminate`, so the specifier must describe a real guarantee.

## 7. When to Use It

- Use it when designing failure paths and non-throwing cleanup or move operations.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A checked division throws for zero, the caller catches the error, and a tiny cleanup function demonstrates a true non-throwing operation. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Letting an exception escape a `noexcept` function calls `std::terminate`, so the specifier must describe a real guarantee. What is the smallest C++11-safe correction?
