# Day 24 — std::unique_ptr and Unique Ownership

## 1. Problem It Solves

`std::unique_ptr` gives one object exclusive resource ownership and releases that resource automatically; ownership moves but does not copy. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 23, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: `std::unique_ptr` gives one object exclusive resource ownership and releases that resource automatically; ownership moves but does not copy. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
std::unique_ptr<int> p(new int(42)); auto q = std::move(p);
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Dereferencing after ownership moved away accesses a null pointer; always test the source or use the new owner.

## 7. When to Use It

- Use it when one scope or object should clearly own one dynamic resource.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A unique pointer owns an integer, transfers ownership to another unique pointer, and proves the old owner is empty. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Dereferencing after ownership moved away accesses a null pointer; always test the source or use the new owner. What is the smallest C++11-safe correction?
