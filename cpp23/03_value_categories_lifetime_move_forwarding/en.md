# Day 3 — Value Categories, Lifetime, Move, and Perfect Forwarding

## 1. Problem It Solves

Modern generic code must preserve whether an argument is a named object or a temporary. Move semantics can transfer resources, while perfect forwarding preserves the caller's value category. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Days 1–2: compile modes and reading compiler diagnostics.
- References, functions, and basic templates from earlier C++ study.

## 3. Core Idea

An lvalue is an object with identity; an rvalue is usually a disposable value. `std::move` permits moving, and `std::forward` conditionally preserves the original category. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
template<class T>
void relay(T&& x) { use(std::forward<T>(x)); }
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Value Categories, Lifetime, Move, and Perfect Forwarding.
1. It forwards one named string as an lvalue and one temporary as an rvalue. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks different overload labels that prove the categories were preserved, making the important behavior easy to verify.

## 6. Common Mistakes

- Reading `std::move` as an operation that always moves is wrong; it is a cast, and the selected operation performs the transfer.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves ownership transfer and forwarding wrappers whose job is to preserve the caller's intent.
- Avoid it when the task involves moving from an object that must still retain its old value, or returning references to expired temporaries.

## 8. Simple Example

A logging wrapper forwards a message to overloads for reusable strings and temporary strings without making an unnecessary copy. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Inside `relay(T&& x)`, why is the expression `x` an lvalue even when the caller passed an rvalue, and how does `std::forward<T>(x)` repair that?
