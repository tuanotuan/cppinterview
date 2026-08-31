# Day 54 — Binary Feed Parsing with `span`, `byteswap`, and `expected`

## 1. Problem It Solves

Binary feeds need bounded access, explicit byte order, and recoverable errors. `std::span` views caller-owned bytes, `std::byteswap` converts endianness when necessary, and `std::expected` returns either a parsed field or an error. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 26: typed success and error results.
- Day 31: byte order and `std::byteswap`.
- Day 50: non-owning views and lifetime.

## 3. Core Idea

Treat parsing as a guarded border crossing: span states the available territory, size checks grant access, memcpy forms the integer safely, and endianness conversion gives host meaning. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::expected<std::uint16_t, Error> parse(std::span<const std::byte> bytes);
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for Binary Feed Parsing with `span`, `byteswap`, and `expected`.
1. It checks two bytes, copies them into an integer, conditionally swaps network order, and returns a typed result. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the decimal value `4660` for bytes `0x12 0x34`, making the important behavior easy to verify.

## 6. Common Mistakes

- Reinterpreting an unaligned byte pointer as `uint16_t*` can violate alignment and aliasing rules; swapping unconditionally breaks big-endian hosts; skipping the size check reads out of bounds.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves small fixed-format binary fields where ownership stays with the caller and errors are expected.
- Avoid it when the task involves complex protocols without explicit bounds, versioning, and validation design.

## 8. Simple Example

A network parser reads a big-endian 16-bit message code from two bytes and reports `too short` instead of throwing. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Why is `memcpy` into a local integer portable for alignment and aliasing, and why is a separate native-endian test still necessary afterward?
