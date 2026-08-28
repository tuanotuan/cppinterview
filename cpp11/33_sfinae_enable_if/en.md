# Day 33 — SFINAE and std::enable_if

## 1. Problem It Solves

SFINAE removes a template candidate when substitution makes its immediate type invalid, and `enable_if` uses that rule to conditionally expose overloads. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 32, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: SFINAE removes a template candidate when substitution makes its immediate type invalid, and `enable_if` uses that rule to conditionally expose overloads. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
typename std::enable_if<std::is_integral<T>::value, int>::type
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Placing the failing expression outside the immediate substitution context turns SFINAE into a hard compile error.

## 7. When to Use It

- Use it when C++11 generic overloads must participate only for supported type categories.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

Two `kind` overloads use `enable_if` so an integer prints `integral` and a floating value prints `non-integral`. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Placing the failing expression outside the immediate substitution context turns SFINAE into a hard compile error. What is the smallest C++11-safe correction?
