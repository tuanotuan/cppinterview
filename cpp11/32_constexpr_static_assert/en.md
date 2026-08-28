# Day 32 — constexpr and static_assert

## 1. Problem It Solves

`constexpr` permits compile-time evaluation when inputs allow it, and `static_assert` rejects a build when a compile-time condition is false. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 31, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: `constexpr` permits compile-time evaluation when inputs allow it, and `static_assert` rejects a build when a compile-time condition is false. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
constexpr int square(int x) { return x*x; } static_assert(square(3)==9, "bad");
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- C++11 `constexpr` function bodies are much more restricted than later standards, so examples copied from C++14 may fail in C++11 mode.

## 7. When to Use It

- Use it when a rule or value can be verified before the program starts.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A C++11-compatible `square` function initializes a constant array size and a static assertion verifies its result during compilation. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: C++11 `constexpr` function bodies are much more restricted than later standards, so examples copied from C++14 may fail in C++11 mode. What is the smallest C++11-safe correction?
