# Day 11 — Explicit Object Parameters and Deducing `this`

## 1. Problem It Solves

Traditional member functions receive an implicit `this`. C++23 can spell the object parameter explicitly, making its type available for deduction and reducing repeated overloads. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 4: templates and member functions.
- Day 10: value categories at return boundaries.

## 3. Core Idea

Read `this Counter& self` as the object slot of a member call becoming visible in the parameter list. Calls still use normal member syntax. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
void add(this Counter& self, int n) { self.value += n; }
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Explicit Object Parameters and Deducing `this`.
1. It updates a small counter through an explicit object parameter when the compiler supports it. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the updated counter or an accurate support message from GCC 13, making the important behavior easy to verify.

## 6. Common Mistakes

- Writing both a trailing `const` qualifier and an explicit object parameter is ill-formed because the object type now belongs in that parameter.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves libraries where the object's cv/ref form should be deduced or shared across one implementation.
- Avoid it when the task involves ordinary members that need no deduction and are clearer with conventional syntax.

## 8. Simple Example

A container accessor replaces four cv/ref-qualified overloads with one explicit-object template. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why is `this Widget& self` not an ordinary first parameter, even though its name is usable like one inside the body?
