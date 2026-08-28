# Day 41 — STL Algorithms, Numeric Algorithms, and Lambdas

## 1. Problem It Solves

Algorithms separate processing from storage through iterator ranges, numeric algorithms combine values, and lambdas provide local policies. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 40, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Algorithms separate processing from storage through iterator ranges, numeric algorithms combine values, and lambdas provide local policies. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
std::sort(v.begin(), v.end()); std::accumulate(v.begin(), v.end(), 0);
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Algorithms trust that iterator pairs form a valid range; mixed or reversed endpoints can cause undefined behavior.

## 7. When to Use It

- Use it when standard operations express intent more clearly than handwritten loops.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A vector is sorted, even values are counted with a lambda predicate, and `accumulate` computes the total. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Algorithms trust that iterator pairs form a valid range; mixed or reversed endpoints can cause undefined behavior. What is the smallest C++11-safe correction?
