# Day 1 — Toolchain, Compiler Flags, and C++11 Mode

## 1. Problem It Solves

A toolchain turns source text into an executable, while compiler flags select the language rules and diagnostics used for that build. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- A text editor, a terminal, and basic command-line navigation.

## 3. Core Idea

Mental model: A toolchain turns source text into an executable, while compiler flags select the language rules and diagnostics used for that build. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
g++ -std=c++11 -Wall -Wextra -Wpedantic main.cpp -o main
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Compiling without an explicit standard can silently accept newer features or reject valid C++11 differently on another machine.

## 7. When to Use It

- Use it when you need a repeatable C++11 build with useful warnings.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

The program prints the value of `__cplusplus`; under `-std=c++11` it identifies the selected language mode and then prints a fixed calculation. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Compiling without an explicit standard can silently accept newer features or reject valid C++11 differently on another machine. What is the smallest C++11-safe correction?
