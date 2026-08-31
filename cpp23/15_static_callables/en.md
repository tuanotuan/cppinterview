# Day 15 — Static Lambdas and Static Call Operators

## 1. Problem It Solves

A callable that uses no object state does not need an implicit object parameter. C++23 permits static lambda call operators and static overloaded `operator()` or `operator[]`. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 14: lambda closure objects and explicit object parameters.
- Basic operator overloading.

## 3. Core Idea

A normal callable carries an unused object doorway. Marking the operator static closes that doorway and expresses that every call depends only on explicit arguments. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
auto twice = [](int x) static { return x * 2; };
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Static Lambdas and Static Call Operators.
1. It invokes a static lambda and stateless static call/subscript operators. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks simple integer results showing that no per-object state is consulted, making the important behavior easy to verify.

## 6. Common Mistakes

- A static lambda cannot capture variables; marking a stateful operation static either fails to compile or hides needed state elsewhere.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves stateless policies, customization objects, and callbacks whose behavior is entirely argument-driven.
- Avoid it when the task involves callables that need captures, per-instance configuration, or polymorphic object state.

## 8. Simple Example

A unit-conversion policy multiplies an input by a fixed compile-time factor and stores no object data. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — What observable difference can remain between a captureless non-static lambda and a static lambda when converting or taking the address of their call operation?
