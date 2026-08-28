# Day 15 — Copy Assignment and the Rule of Three

## 1. Problem It Solves

Copy assignment replaces the state of an existing object; a raw-resource owner that defines it usually also needs a destructor and copy constructor. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 14, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Copy assignment replaces the state of an existing object; a raw-resource owner that defines it usually also needs a destructor and copy constructor. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
Owner& operator=(const Owner& other); // destructor + copy ctor + copy assignment
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Failing to handle self-assignment or replacing the old resource before a safe copy can corrupt data or leak memory.

## 7. When to Use It

- Use it when maintaining a legacy type that directly owns a raw resource.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A one-integer owner performs deep copy construction and copy assignment, proving that two objects hold independent allocations. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Failing to handle self-assignment or replacing the old resource before a safe copy can corrupt data or leak memory. What is the smallest C++11-safe correction?
