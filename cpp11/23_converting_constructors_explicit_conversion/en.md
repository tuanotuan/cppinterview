# Day 23 — Converting Constructors and explicit Conversion

## 1. Problem It Solves

A one-argument constructor can define an implicit conversion; `explicit` requires callers to state that conversion and prevents surprising overload matches. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 22, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: A one-argument constructor can define an implicit conversion; `explicit` requires callers to state that conversion and prevents surprising overload matches. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
explicit Seconds(int value); use(Seconds{5});
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Leaving a domain constructor implicit can turn unrelated integers into domain objects silently, hiding unit mistakes.

## 7. When to Use It

- Use it when a conversion is safe and obvious only when written at the call site.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

An explicit seconds type must be constructed at the call site, while a deliberately implicit score type demonstrates the contrast. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Leaving a domain constructor implicit can turn unrelated integers into domain objects silently, hiding unit mistakes. What is the smallest C++11-safe correction?
