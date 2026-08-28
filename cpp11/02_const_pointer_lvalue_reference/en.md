# Day 2 — const, Pointers, and Lvalue References

## 1. Problem It Solves

`const` protects a value from accidental change, a pointer stores an address, and an lvalue reference is another name for an existing object. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 1, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: `const` protects a value from accidental change, a pointer stores an address, and an lvalue reference is another name for an existing object. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
const int limit = 10; int* p = &value; int& ref = value;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- A dangling pointer or reference refers to an object that no longer exists; dereferencing it has undefined behavior.

## 7. When to Use It

- Use it when you need non-owning access, optional addressing, or read-only intent.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A pointer and a reference both update one integer, while a pointer-to-const observes the final value without permission to modify it. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: A dangling pointer or reference refers to an object that no longer exists; dereferencing it has undefined behavior. What is the smallest C++11-safe correction?
