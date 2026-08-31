# Day 29 — `std::forward_like`

## 1. Problem It Solves

Generic accessors often need to forward a member like some other type rather than like the member's own deduced type. `std::forward_like<T>` copies the cv/ref pattern of `T` onto another expression. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 3: `std::forward` and value categories.
- Day 12: projecting cv/ref properties from an object.

## 3. Core Idea

Use `T` as a stamp containing `const` and lvalue/rvalue ink. `forward_like<T>(x)` stamps those useful properties onto `x` without moving any data by itself. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
return std::forward_like<Self>(object.member);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::forward_like`.
1. It projects an owner's lvalue or rvalue category onto its integer member and checks the result type. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks compile-time proof of lvalue-reference and rvalue-reference projection, making the important behavior easy to verify.

## 6. Common Mistakes

- Using `std::forward<decltype(member)>` forwards according to the member declaration, not the owner; storing a projected rvalue reference beyond the owner's lifetime can dangle.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves accessors, tuple-like utilities, and proxy objects that must mirror another object's cv/ref category.
- Avoid it when the task involves ordinary forwarding where `std::forward<T>(x)` already has the exact intended source type.

## 8. Simple Example

A wrapper exposes its payload as mutable, const, movable, or non-movable according to how the wrapper itself is used. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — For `T = const Widget&`, which cv/ref qualifiers does `std::forward_like<T>(x)` add, and which qualifiers from `x` are not blindly copied?
