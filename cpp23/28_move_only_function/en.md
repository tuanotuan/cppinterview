# Day 28 — `std::move_only_function`

## 1. Problem It Solves

`std::function` requires its stored target to be copyable. C++23 adds `std::move_only_function` so a type-erased callback can own move-only state such as a `std::unique_ptr`. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 3: move-only ownership and forwarding.
- Days 14–15: lambdas and callable objects.

## 3. Core Idea

It is a callable box that may itself be moved but not copied. The signature written in angle brackets defines how callers may invoke whatever target is inside. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::move_only_function<int()> task = [p = std::move(ptr)] { return *p; };
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::move_only_function`.
1. It stores a lambda that owns a unique pointer and invokes it through type erasure. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the integer owned only by the callback, making the important behavior easy to verify.

## 6. Common Mistakes

- Copying the wrapper is a compile error, and calling an empty wrapper has undefined behavior rather than the `bad_function_call` guarantee of `std::function`.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves callbacks that need runtime type erasure and must own non-copyable captures.
- Avoid it when the task involves a concrete lambda type is sufficient or callers truly require a copyable callback.

## 8. Simple Example

A job queue stores tasks that each own a different resource and transfers every task to one worker. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — What happens to the source after moving a non-empty `move_only_function`, and what precondition must hold before invoking either wrapper?
