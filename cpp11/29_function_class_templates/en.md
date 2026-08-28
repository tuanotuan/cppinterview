# Day 29 — Function Templates and Class Templates

## 1. Problem It Solves

Templates describe a family of functions or classes once, letting the compiler instantiate type-specific versions when they are used. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 28, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Templates describe a family of functions or classes once, letting the compiler instantiate type-specific versions when they are used. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
template<class T> T bigger(T a, T b); template<class T> class Box;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- A template body may look valid until a particular type instantiates an unsupported operation, moving the diagnostic to the use site.

## 7. When to Use It

- Use it when the same type-safe operation or container shape works for several types.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A function template selects the larger value and a class template stores one typed value; both are instantiated for simple types. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: A template body may look valid until a particular type instantiates an unsupported operation, moving the diagnostic to the use site. What is the smallest C++11-safe correction?
