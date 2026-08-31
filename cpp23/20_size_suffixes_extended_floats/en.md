# Day 20 — `z`/`uz` Literal Suffixes and Extended Floating Types

## 1. Problem It Solves

Index arithmetic frequently mixes signed integers with `std::size_t`, while numeric code sometimes needs a specific interchange width. C++23 adds size-related literal suffixes and optional extended floating typedefs. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 1: implementation support and portability.
- Day 9: `auto` type deduction.

## 3. Core Idea

`uz` creates `std::size_t`; `z` creates its signed counterpart. `<stdfloat>` names supported fixed-width floating formats, but an implementation need not provide every format. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
auto count = 10uz;
auto offset = -1z;
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `z`/`uz` Literal Suffixes and Extended Floating Types.
1. It checks the literal types and conditionally reports a fixed-width floating type. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks size information and a clear availability result, making the important behavior easy to verify.

## 6. Common Mistakes

- Using `-1uz` wraps in an unsigned type; assuming `std::float32_t` always exists makes otherwise portable code fail to compile.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves container sizes, index differences, and protocols that explicitly require a supported floating format.
- Avoid it when the task involves adding suffixes without checking signedness, or selecting extended floats merely because their names look precise.

## 8. Simple Example

A reverse index uses `-1z` to stay in the signed size-related type instead of wrapping as unsigned. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — Compare the deduced types and values of `-1z`, `-1uz`, and `auto n = 1uz - 2uz`; which operation wraps?
