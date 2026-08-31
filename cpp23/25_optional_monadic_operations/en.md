# Day 25 — Monadic Operations on `std::optional`

## 1. Problem It Solves

Code that repeatedly checks an optional value becomes nested and noisy. C++23 adds `and_then`, `transform`, and `or_else` so success and empty paths can be composed explicitly. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 5: lazy transformation pipelines.
- Day 24: adopting C++23 library facilities safely.

## 3. Core Idea

Picture a box that may be empty. `transform` changes the item without opening an empty box, `and_then` may return a new box, and `or_else` handles emptiness. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
opt.transform(f).and_then(g).or_else(recover);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Monadic Operations on `std::optional`.
1. It doubles a present score, validates it, converts it to text, and supplies a fallback if needed. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the transformed text for the fixed valid score, making the important behavior easy to verify.

## 6. Common Mistakes

- Returning a plain value from `and_then` is a type error because its callable must return another optional; capturing dangling references in pipeline lambdas is also unsafe.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves short sequences of dependent operations where absence should skip later success steps.
- Avoid it when the task involves pipelines whose lambdas hide complex control flow better written with named steps or ordinary `if` statements.

## 8. Simple Example

A settings lookup parses an optional port, validates its range, and uses a default only when no valid value remains. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — How do the required return types of callables passed to `transform` and `and_then` differ, and what nesting occurs if they are confused?
