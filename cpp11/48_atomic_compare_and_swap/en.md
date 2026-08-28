# Day 48 — Atomic Operations and Compare-and-Swap

## 1. Problem It Solves

An atomic object performs indivisible operations, and compare-and-swap changes a value only when it still equals an expected snapshot. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 47, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: An atomic object performs indivisible operations, and compare-and-swap changes a value only when it still equals an expected snapshot. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
value.compare_exchange_strong(expected, desired);
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- On CAS failure, `expected` is overwritten with the current value; retry loops that ignore this rule compare against stale assumptions.

## 7. When to Use It

- Use it when simple shared state needs lock-free indivisible updates.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A strong CAS changes five to nine, then `fetch_add` returns the old value while atomically increasing the stored value. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: On CAS failure, `expected` is overwritten with the current value; retry loops that ignore this rule compare against stale assumptions. What is the smallest C++11-safe correction?
