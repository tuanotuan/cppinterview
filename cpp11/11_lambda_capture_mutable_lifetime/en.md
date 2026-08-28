# Day 11 — Lambdas, Captures, mutable, and Capture Lifetime

## 1. Problem It Solves

A lambda creates a small callable object near the code that uses it; captures specify which surrounding values it copies or references. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 10, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: A lambda creates a small callable object near the code that uses it; captures specify which surrounding values it copies or references. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
int n=1; auto f = [n]() mutable { return ++n; };
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- A lambda that captures a local variable by reference must not outlive that variable, or calling it later accesses a dangling reference.

## 7. When to Use It

- Use it when a short operation belongs next to an algorithm or callback site.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

One lambda changes its private copied capture using `mutable`; another safely updates a referenced total while the total is still alive. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: A lambda that captures a local variable by reference must not outlive that variable, or calling it later accesses a dangling reference. What is the smallest C++11-safe correction?
