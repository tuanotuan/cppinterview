# Day 12 — Classes, Constructors, and Member Initializer Lists

## 1. Problem It Solves

A class groups state with operations, a constructor establishes a valid starting state, and a member initializer list constructs members directly. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 11, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: A class groups state with operations, a constructor establishes a valid starting state, and a member initializer list constructs members directly. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
class Counter { int value_; public: Counter(int v) : value_(v) {} };
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Members initialize in declaration order, not the textual order of the initializer list; assuming otherwise can create logic bugs.

## 7. When to Use It

- Use it when an object must preserve a small invariant and initialize members once.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A `Counter` constructor initializes its value directly, an operation increments it, and a query prints the valid state. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Members initialize in declaration order, not the textual order of the initializer list; assuming otherwise can create logic bugs. What is the smallest C++11-safe correction?
