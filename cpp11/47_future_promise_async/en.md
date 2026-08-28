# Day 47 — Futures, Promises, and std::async

## 1. Problem It Solves

A future receives one eventual result, a promise supplies it explicitly, and `std::async` packages task launch and result transport. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 46, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: A future receives one eventual result, a promise supplies it explicitly, and `std::async` packages task launch and result transport. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
std::future<int> f = std::async(std::launch::async, task); int x = f.get();
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Calling `get` twice is invalid because a normal future transfers its stored result only once; a broken promise also reports an exception.

## 7. When to Use It

- Use it when one result or exception must cross an asynchronous boundary.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A promise sends one integer from a thread, and a separately launched async task returns another fixed calculation. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Calling `get` twice is invalid because a normal future transfers its stored result only once; a broken promise also reports an exception. What is the smallest C++11-safe correction?
