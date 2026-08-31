# Day 4 — Templates, Concepts, CRTP, and Generic Programming

## 1. Problem It Solves

Templates let one algorithm work with many types. Concepts state the required operations, while CRTP gives compile-time customization through a derived type without virtual dispatch. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 3: references, value categories, and forwarding.
- Basic classes and function overloading from earlier C++ study.

## 3. Core Idea

A template is a recipe, a concept is its ingredient checklist, and CRTP lets the recipe refer to the final concrete cook at compile time. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
template<class T>
requires Addable<T>
T add(T a, T b);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Templates, Concepts, CRTP, and Generic Programming.
1. It checks a constrained addition function and a small CRTP-provided print operation. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks a numeric sum followed by a value supplied through the derived type, making the important behavior easy to verify.

## 6. Common Mistakes

- An unconstrained template may fail deep inside its body; an over-broad concept may accept a type whose operation has the wrong meaning.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves small zero-overhead generic algorithms and reusable static mixins with a clear requirement.
- Avoid it when the task involves CRTP when ordinary composition or a free constrained function is simpler.

## 8. Simple Example

A numeric utility accepts any type supporting meaningful addition and rejects unrelated types at the call site. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — If a concept checks only that `a + b` is syntactically valid, what semantic misunderstanding can still pass the constraint?
