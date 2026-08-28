# Day 46 — Mutexes, Locks, and Condition Variables

## 1. Problem It Solves

A mutex protects a shared invariant, RAII locks release it safely, and a condition variable lets a thread sleep until guarded state may satisfy a predicate. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 45, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: A mutex protects a shared invariant, RAII locks release it safely, and a condition variable lets a thread sleep until guarded state may satisfy a predicate. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
std::unique_lock<std::mutex> lock(m); cv.wait(lock, predicate);
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Waiting without a predicate is wrong because wakeups may be spurious; reading shared state outside its mutex can create a data race.

## 7. When to Use It

- Use it when threads coordinate around shared state rather than spin continuously.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A producer stores one value under a lock and notifies; a consumer waits with a predicate and prints that value. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Waiting without a predicate is wrong because wakeups may be spurious; reading shared state outside its mutex can create a data race. What is the smallest C++11-safe correction?
