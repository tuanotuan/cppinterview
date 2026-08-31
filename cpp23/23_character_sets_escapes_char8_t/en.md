# Day 23 — Character Sets, Escapes, and `char8_t` Portability

## 1. Problem It Solves

Source characters, Unicode code points, and encoded bytes are different layers. C++23 clarifies source encoding rules, while `char8_t` makes UTF-8 intent visible in the type system. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: compiler and platform differences.
- Day 20: implementation-provided types.

## 3. Core Idea

An escape such as `\u1EC7` names a code point. A `u8` literal encodes it as UTF-8 code units of type `char8_t`; one displayed character may occupy several units. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
constexpr char8_t text[] = u8"Vi\u1EC7t";
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Character Sets, Escapes, and `char8_t` Portability.
1. It checks the element type and reports the UTF-8 code-unit count. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks six code units for the fixed Vietnamese text fragment, making the important behavior easy to verify.

## 6. Common Mistakes

- Streaming `char8_t*` directly to `std::cout` is not portable, and indexing UTF-8 bytes as if each were one character breaks non-ASCII text.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves marking UTF-8 storage or interfaces explicitly and counting bytes when bytes are truly required.
- Avoid it when the task involves using code-unit indexing for user-visible character operations without Unicode decoding.

## 8. Simple Example

A network payload stores a UTF-8 label in `std::u8string` and validates bytes before display conversion. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why is `sizeof(u8"ệ") - 1` greater than one although the source appears to contain one character?
