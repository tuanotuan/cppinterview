# Day 31 — Enum and Bit Utilities

## 1. Problem It Solves

C++23 makes common low-level intent explicit: `std::to_underlying` extracts an enum's integer representation, `std::is_scoped_enum` identifies scoped enums, and `std::byteswap` reverses byte order. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 20: integer types and signedness.
- Scoped enums and basic bit representation.

## 3. Core Idea

An enum is a labeled integer, a type trait is a compile-time question, and byteswap turns a multi-byte word end-for-end without changing individual bits inside each byte. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
auto raw = std::to_underlying(code);
auto reversed = std::byteswap(raw);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Enum and Bit Utilities.
1. It checks that an enum is scoped, extracts its value, and reverses the two bytes. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the original integer, a true trait result, and the swapped integer, making the important behavior easy to verify.

## 6. Common Mistakes

- Using byteswap without first deciding the source and host endianness can double-swap data; replacing enum type safety with raw integers weakens interfaces.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves binary formats, protocol boundaries, and generic code that treats scoped enums specially.
- Avoid it when the task involves ordinary arithmetic where byte order is irrelevant or an enum should remain strongly typed.

## 8. Simple Example

A packet parser converts a two-byte network field to host order and maps the resulting number to a scoped status code. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Does `std::to_underlying` preserve the exact underlying signedness, and how can that affect a later `std::byteswap` instantiation?
