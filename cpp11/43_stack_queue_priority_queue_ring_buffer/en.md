# Day 43 — Stack, Queue, Priority Queue, and Ring Buffer

## 1. Problem It Solves

Container adapters restrict access to LIFO, FIFO, or highest-priority behavior, while a ring buffer reuses a fixed circular storage area. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 42, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Container adapters restrict access to LIFO, FIFO, or highest-priority behavior, while a ring buffer reuses a fixed circular storage area. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
std::stack<int> s; std::queue<int> q; std::priority_queue<int> p;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Calling `top` or `front` on an empty adapter is undefined behavior; ring indices must also distinguish full from empty.

## 7. When to Use It

- Use it when processing order has a clear stack, arrival, priority, or bounded-cyclic rule.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

The three standard adapters expose their next item, and a three-slot array demonstrates circular overwrite with modulo indexing. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Calling `top` or `front` on an empty adapter is undefined behavior; ring indices must also distinguish full from empty. What is the smallest C++11-safe correction?
