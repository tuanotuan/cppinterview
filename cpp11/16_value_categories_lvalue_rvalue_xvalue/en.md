# Day 16 — lvalue, rvalue, xvalue, and Value Categories

## 1. Problem It Solves

Value categories describe how an expression relates to identity and resources: lvalues have stable identity, prvalues compute values, and xvalues mark reusable state. It makes an important constraint visible instead of leaving readers to guess. This lesson keeps only the C++11 core that fits one focused day.

## 2. Prerequisites

- The ideas from Day 15, plus basic variables, functions, and output already introduced.

## 3. Core Idea

Mental model: Value categories describe how an expression relates to identity and resources: lvalues have stable identity, prvalues compute values, and xvalues mark reusable state. Identify the relevant value or state, who owns it, and whether the rule acts during compilation or execution.

## 4. Minimal Syntax

```cpp
inspect(value); inspect(7); inspect(static_cast<int&&>(value));
```

## 5. How It Works

1. The example creates a tiny fixed state with no keyboard input.
1. C++11 or the standard-library contract applies today's rule.
1. The program prints the important result so it can be checked against the source.

## 6. Common Mistakes

- Value category belongs to an expression, not permanently to a variable's declared type; a named rvalue-reference variable is itself an lvalue expression.

## 7. When to Use It

- Use it when reasoning about overload selection, copying, and moving.
- Avoid it when it hides ownership, lifetime, type, ordering, or cost.

## 8. Simple Example

Overloads report an ordinary named variable as lvalue, a literal as rvalue, and an explicit cast as xvalue. The `.cpp` keeps the data fixed and avoids unrelated abstraction.

## 9. Key Takeaways

- The feature is part of the C++11 scope used in this course.
- Understand its lifetime, ownership, type, and ordering consequences.
- Compile with warnings and prefer the smallest form that makes the rule obvious.

## 10. Self-Check Questions

1. Easy — What problem does today's feature solve, and which token or declaration in the minimal syntax activates it?
1. Medium — Read the small example described above. What value or state should it print, and which rule produces that result?
1. Hard — Find and explain the subtle bug in this situation: Value category belongs to an expression, not permanently to a variable's declared type; a named rvalue-reference variable is itself an lvalue expression. What is the smallest C++11-safe correction?
