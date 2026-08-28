# Day 18 — std::move and Moved-from State

## 1. Problem It Solves

`std::move` is a cast that permits move-aware operations; it does not move by itself, and the source remains valid but its value is generally unspecified. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 17, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: `std::move` is a cast that permits move-aware operations; it does not move by itself, and the source remains valid but its value is generally unspecified. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
std::string target = std::move(source);
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Reading a moved-from object as if it kept its old value is a logic bug; only operations allowed by the type's valid-state contract are safe.

## 7. When to Use It

- Use it when transferring resources from an object that is no longer needed.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A string transfers its text to another string, then the moved-from source is assigned a fresh value before being read again. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Reading a moved-from object as if it kept its old value is a logic bug; only operations allowed by the type's valid-state contract are safe. What is the smallest C++11-safe correction?
