# Day 38 — String Containment and `resize_and_overwrite`

## 1. Problem It Solves

Searching for a substring should not require comparing against `npos`, and filling a string through a raw writable buffer should not require a separate resize correction. C++23 adds direct APIs for both jobs. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 23: text representation and code units.
- Lambdas and `std::string_view`.

## 3. Core Idea

`contains` answers a yes/no question. `resize_and_overwrite` lends writable storage of a requested size to a callback, which returns the actual number of initialized characters. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
bool found = text.contains(needle);
text.resize_and_overwrite(n, writer);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for String Containment and `resize_and_overwrite`.
1. It checks two contained fragments and replaces a string through its provided buffer. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks two true results followed by the rewritten short string, making the important behavior easy to verify.

## 6. Common Mistakes

- Returning a size greater than the callback's supplied capacity is undefined behavior; using byte-based contains as a Unicode semantic search can split grapheme expectations.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves clear substring tests and efficient direct generation into owned string storage.
- Avoid it when the task involves external APIs that retain the temporary buffer pointer or text operations requiring Unicode normalization.

## 8. Simple Example

A formatter reserves exactly three characters, writes `C++`, and returns the initialized length. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — What happens if the overwrite callback initializes only three characters but returns the requested size of ten?
