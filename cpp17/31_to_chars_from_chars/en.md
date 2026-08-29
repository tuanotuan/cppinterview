# Day 31 — std::to_chars and std::from_chars

## 1. Problem It Solves

Streams and locale-aware conversions can be heavier or less predictable than low-level numeric parsing needs. Character-conversion functions operate on explicit buffers without allocation, locale, or exceptions.

This lesson reduces that broad problem to one fixed-input program so the language rule and its observable result can be checked independently.

## 2. Prerequisites

- A C++17 compiler invoked with warnings enabled and the earlier lessons listed in the course order.
- Know character buffers, half-open pointer ranges, integer bases, error codes, and `std::string_view`.

## 3. Core Idea

`std::to_chars` writes digits into `[first, last)` and returns the end pointer plus an error code. `std::from_chars` parses from a similar range, reports where parsing stopped, and leaves error handling to the caller.

Keep the type, object lifetime, ownership, and evaluation boundary visible while reading the example; syntax is useful only when those semantics are understood.

## 4. Minimal Syntax

```cpp
auto written = std::to_chars(first, last, value, 16);
auto parsed = std::from_chars(first, written.ptr, output, 16);
```

## 5. How It Works

1. An integer is converted to lowercase hexadecimal in a fixed array, then the exact produced range is parsed back.
2. Both returned error codes and the parse end pointer are checked before the reconstructed value is accepted.
3. The program prints `encoded: ff` and `parsed: 255`, giving a small test oracle that can be compared with the prediction made before compilation.

## 6. Common Mistakes

- The output is not automatically null-terminated, whitespace is not skipped like a stream, and partial parses must be detected through the returned pointer.
- A successful build is not proof of correct semantics. Recheck lifetimes, invalidation, ordering, error paths, and required headers or link flags for the real program.

## 7. When to Use It

- Use this technique when performance-sensitive or protocol code controls buffers and needs locale-independent numeric text.
- Choose a simpler C++11/14 form when the C++17 rule does not improve safety, clarity, or measured performance for the supported toolchains.

## 8. Simple Example

A string view is built directly from the produced pointer range. Parsing succeeds only if all characters are consumed.

The companion `.cpp` file has no input or external dependency. Predict the complete output, compile it, run it, then change one constant and explain the new result.

## 9. Key Takeaways

- Character conversions are small, explicit primitives; buffer sizing and complete error checks are the caller's contract.
- C++17 mode must be selected explicitly; a newer compiler default can otherwise hide a portability error.
- Warnings, deterministic examples, and small assertions turn a remembered rule into evidence.
- Document any lifetime, ownership, synchronization, or allocation contract at the API boundary.

## 10. Self-Check Questions

1. Easy — What problem does std::to_chars and std::from_chars address?
2. Medium — Why is no null terminator needed when constructing the view?
3. Hard — How should a parser distinguish invalid input, overflow, and a valid numeric prefix followed by junk?
