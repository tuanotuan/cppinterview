# Day 39 — Sequence Containers, emplace, and Container Ownership

## 1. Problem It Solves

Sequence containers own elements in order, and `emplace` constructs an element directly from arguments at the insertion position. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 38, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Sequence containers own elements in order, and `emplace` constructs an element directly from arguments at the insertion position. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
values.emplace_back(3, 'A'); values.emplace(values.begin(), "first");
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- References and iterators may be invalidated by insertion, especially when a vector reallocates its contiguous storage.

## 7. When to Use It

- Use it when ordered owned elements need efficient traversal and controlled insertion.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A vector emplaces strings directly and a deque shows front insertion; the program prints their stable logical order. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: References and iterators may be invalidated by insertion, especially when a vector reallocates its contiguous storage. What is the smallest C++11-safe correction?
