# Day 40 — Iterator Categories and Iterator Invalidation

## 1. Problem It Solves

Iterator categories describe supported movement and access, while invalidation rules say when container changes make stored iterators unusable. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 39, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Iterator categories describe supported movement and access, while invalidation rules say when container changes make stored iterators unusable. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
auto it = v.begin(); v.reserve(3); // capacity decisions affect validity
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Dereferencing an invalidated iterator is undefined behavior even if the old address appears to contain the expected value.

## 7. When to Use It

- Use it when choosing algorithms and preserving traversal state across container changes.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A reserved vector keeps an iterator valid for one insertion, while a list iterator is advanced with category-neutral `std::advance`. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Dereferencing an invalidated iterator is undefined behavior even if the old address appears to contain the expected value. What is the smallest C++11-safe correction?
