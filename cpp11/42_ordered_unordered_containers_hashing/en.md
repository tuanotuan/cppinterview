# Day 42 — Ordered and Unordered Containers with Hashing

## 1. Problem It Solves

Ordered containers maintain key order through comparison, while unordered containers place keys into buckets using a hash and equality relation. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 41, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Ordered containers maintain key order through comparison, while unordered containers place keys into buckets using a hash and equality relation. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
std::map<std::string,int> ordered; std::unordered_map<std::string,int> fast;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- If equality says two keys match, their hashes must match too; violating that contract makes lookup behavior incorrect.

## 7. When to Use It

- Use it when you need sorted traversal or average constant-time lookup by key.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A map demonstrates deterministic sorted iteration and an unordered map demonstrates direct lookup without relying on bucket order. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: If equality says two keys match, their hashes must match too; violating that contract makes lookup behavior incorrect. What is the smallest C++11-safe correction?
