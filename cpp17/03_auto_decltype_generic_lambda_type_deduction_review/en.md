# Day 3 — Reviewing auto, decltype, Generic Lambdas, and Type Deduction

## 1. Problem It Solves

Verbose dependent types obscure intent, but careless deduction can silently copy a value or discard qualifiers. C++ deduction tools remove repetition while requiring precise reasoning about references and expression categories.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know `const`, lvalue references, function templates, and basic lambda capture.

## 3. Core Idea

`auto` follows template-like deduction and normally drops top-level `const` and references. `decltype(name)` preserves a declared type, while a generic lambda's `auto` parameters make its call operator a function template.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
const int value = 7;
auto copy = value;
decltype(value) exact = value;
auto twice = [](auto x) { return x + x; };
```

## 5. How It Works

1. Static assertions verify deduced value and reference types instead of relying on visual intuition.
2. The generic lambda instantiates separate call operators for integer and floating-point arguments and deduces each return expression.
3. The program prints `twice int: 10` and `twice double: 5`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- Plain `auto` creates a copy when an alias may have been intended; choose `auto&`, `const auto&`, or `decltype(auto)` deliberately.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when the initializer or callable invocation makes the concrete type obvious and spelling it adds noise.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

The sample verifies qualifiers at compile time, then calls one generic lambda with two arithmetic types. Fixed input keeps the output straightforward.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Deduction shortens declarations, but reference preservation and conversions remain design decisions rather than compiler guesses.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does Reviewing auto, decltype, Generic Lambdas, and Type Deduction address?
2. Medium — Why is `copy` assignable even though its initializer was declared `const`?
3. Hard — How do `decltype(x)` and `decltype((x))` differ for a named lvalue?
