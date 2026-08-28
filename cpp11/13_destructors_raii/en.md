# Day 13 — Destructors and RAII

## 1. Problem It Solves

A destructor runs when an object lifetime ends, enabling RAII: acquire a resource in an object and release it automatically at scope exit. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 12, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: A destructor runs when an object lifetime ends, enabling RAII: acquire a resource in an object and release it automatically at scope exit. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
Guard g(resource); // g releases resource in ~Guard()
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Manual cleanup on only the normal path leaks resources when an early return or exception skips that cleanup.

## 7. When to Use It

- Use it when a resource has one clear owner and must be released on every exit path.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A guard marks a Boolean resource as acquired in its constructor and automatically clears it when the inner block ends. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Manual cleanup on only the normal path leaks resources when an early return or exception skips that cleanup. What is the smallest C++11-safe correction?
