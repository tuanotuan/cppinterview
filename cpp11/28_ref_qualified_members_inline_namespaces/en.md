# Day 28 — Ref-qualified Members and Inline Namespaces

## 1. Problem It Solves

Ref qualifiers choose member behavior for lvalue versus temporary objects, while an inline namespace versions an API without changing its usual qualified name. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 27, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Ref qualifiers choose member behavior for lvalue versus temporary objects, while an inline namespace versions an API without changing its usual qualified name. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
void show() &; void show() &&; inline namespace v1 { int version(); }
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Returning a reference from an rvalue-qualified member can expose a subobject of a temporary that dies immediately.

## 7. When to Use It

- Use it when an API must distinguish persistent and temporary receivers or provide versioned names.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

A named label selects the `&` overload, a temporary selects `&&`, and `api::version()` resolves through inline namespace `v1`. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Returning a reference from an rvalue-qualified member can expose a subobject of a temporary that dies immediately. What is the smallest C++11-safe correction?
