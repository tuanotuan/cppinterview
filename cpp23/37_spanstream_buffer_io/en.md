# Day 37 — `std::spanstream` and Buffer-Based I/O

## 1. Problem It Solves

String streams own a dynamically managed string. C++23 span streams provide familiar stream extraction and insertion over a caller-supplied contiguous character buffer. The goal is to make the relevant rule visible in code instead of relying on an assumption about what “C++23 support” means.

## 2. Prerequisites

- Day 5: contiguous ranges and views.
- Day 35: formatted text output.

## 3. Core Idea

The stream is a temporary reader or writer placed over a window of memory. The owner controls the storage; the stream controls formatted cursor movement inside that window. Read the syntax from left to right, identify the value, object, or range being transformed, and then check its resulting type, lifetime, or ownership. Standardization and implementation are separate: a C++23 mode may still lack one library component, so a feature-test macro is part of responsible portable use.

## 4. Minimal Syntax

```cpp
std::ospanstream out(buffer);
std::ispanstream in(out.span());
```

## 5. How It Works

1. The sample builds the smallest expression or object needed for `std::spanstream` and Buffer-Based I/O.
1. It writes two integers to a fixed buffer and parses them back through the written span. The compiler and library apply the relevant rule before the program observes the result.
1. The program prints or checks the original two integers recovered without an owned stringstream buffer, making the important behavior easy to verify.

## 6. Common Mistakes

- Writing beyond the supplied capacity sets stream failure state; treating the full original buffer as valid output instead of `span()` includes unwritten bytes.
- Enabling C++23 mode without checking the relevant feature macro may select code that the installed compiler or standard library does not implement yet.

## 7. When to Use It

- Use it when the task involves bounded text protocols, embedded buffers, and allocation-sensitive formatted parsing.
- Avoid it when the task involves unbounded output whose required size is unknown and easier to own in a `std::string`.

## 8. Simple Example

A small device message formats two readings into a 32-byte stack buffer and immediately parses them for a test. The downloadable program keeps the data fixed so the output can be compared without entering input.

## 9. Key Takeaways

- Separate the language rule from compiler and library availability.
- Keep lifetime, ownership, and deduced types visible when they affect correctness.
- Prefer the smallest syntax that communicates the intent.
- Guard facilities that are not yet uniformly implemented.

## 10. Self-Check Questions

1. Easy — What is the smallest syntax in Section 4, and what main job does it perform?
1. Medium — Read the sample program: which value, type, or branch is observed, and why?
1. Hard — After an output spanstream writes fewer bytes than its capacity, why must the input span be built from `out.span()` rather than the original whole buffer?
