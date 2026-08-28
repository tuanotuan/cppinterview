# Day 25 — std::shared_ptr, std::weak_ptr, and std::make_shared

## 1. Problem It Solves

`shared_ptr` counts shared owners, `weak_ptr` observes without increasing that count, and `make_shared` creates the object and control block together. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 24, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: `shared_ptr` counts shared owners, `weak_ptr` observes without increasing that count, and `make_shared` creates the object and control block together. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
auto owner = std::make_shared<int>(42); std::weak_ptr<int> view = owner;
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Strong-reference cycles keep counts above zero forever; one link in a back-reference cycle usually needs to be weak.

## 7. When to Use It

- Use it when ownership is genuinely shared and observers must detect expiration.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

Two shared owners expose the use count, a weak observer locks successfully, then reports expiration after all owners reset. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Strong-reference cycles keep counts above zero forever; one link in a back-reference cycle usually needs to be weak. What is the smallest C++11-safe correction?
