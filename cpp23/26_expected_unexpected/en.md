# Day 26 — `std::expected` and `std::unexpected`

## 1. Problem It Solves

An operation may fail for a reason that callers need to inspect. `std::expected<T, E>` stores either a success value `T` or an error `E`; `std::unexpected` constructs the error alternative. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 25: optional success pipelines.
- Variants, return values, and error handling.

## 3. Core Idea

It is a two-track result. Unlike an exception, the error track appears in the function type and must be inspected before accessing the success value. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::expected<int, Error> result = value;
return std::unexpected(error);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::expected` and `std::unexpected`.
1. It returns either a fixed integer or a descriptive string error from a tiny parser. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the success value for the fixed valid input, making the important behavior easy to verify.

## 6. Common Mistakes

- Calling `value()` without checking may throw `std::bad_expected_access`; choosing a huge or unrelated error type makes every result heavier and harder to use.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves expected, routine failures such as parsing, validation, and recoverable I/O status.
- Avoid it when the task involves programmer bugs or truly exceptional failures where local recovery is not meaningful.

## 8. Simple Example

A port parser returns the numeric port or a message such as `out of range` without throwing. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — If `T` and `E` are the same type, how do constructors distinguish a success from an error, and why is `std::unexpected` essential?
