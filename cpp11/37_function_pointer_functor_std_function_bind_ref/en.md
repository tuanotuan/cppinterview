# Day 37 — Function Pointers, Functors, std::function, std::bind, and std::ref

## 1. Problem It Solves

C++ callables have different concrete types; `std::function` erases those types, `std::bind` pre-binds arguments, and `std::ref` preserves reference semantics. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 36, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: C++ callables have different concrete types; `std::function` erases those types, `std::bind` pre-binds arguments, and `std::ref` preserves reference semantics. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
int (*fp)(int,int)=add; std::function<int(int)> f = functor;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- `std::bind` copies bound arguments by default, so forgetting `std::ref` updates a private copy instead of the original object.

## 7. When to Use It

- Use it when an interface needs to store or pass several compatible callable forms.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

The program calls a normal function through a pointer, a functor through `std::function`, and a bound increment that updates an integer via `std::ref`. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: `std::bind` copies bound arguments by default, so forgetting `std::ref` updates a private copy instead of the original object. What is the smallest C++11-safe correction?
